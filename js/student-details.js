
document.addEventListener('DOMContentLoaded', async () => {
    // Get the student ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('id');
    
    // DOM Elements
    const studentNameElement = document.getElementById('student-name');
    const studentRankElement = document.getElementById('student-rank');
    const studentPointsElement = document.getElementById('student-points');
    const challengeListElement = document.getElementById('challenge-list');
    const bonusStatusElement = document.getElementById('bonus-status');
    const bonusChallengeListElement = document.getElementById('bonus-challenge-list');
    
    // If no student ID is provided, redirect back to the leaderboard
    if (!studentId) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize real-time subscriptions
    initializeRealTimeUpdates(studentId);
    
    // Load student data
    await loadStudentData(studentId);
    
    // Function to load student data
    async function loadStudentData(id) {
        try {
            // Fetch student details
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('id', id)
                .single();
                
            if (studentError) throw studentError;
            
            // Fetch all students for ranking calculation
            const { data: allStudents, error: rankError } = await supabase
                .from('students')
                .select('id, total_points')
                .order('total_points', { ascending: false });
                
            if (rankError) throw rankError;
            
            // Calculate student rank
            const rank = allStudents.findIndex(s => s.id === student.id) + 1;
            
            // Update student info in the UI
            studentNameElement.textContent = student.name;
            studentRankElement.textContent = rank;
            studentPointsElement.textContent = student.total_points;
            
            // Fetch challenges
            const { data: challenges, error: challengesError } = await supabase
                .from('challenges')
                .select('*')
                .order('name');
                
            if (challengesError) throw challengesError;
            
            // Fetch student challenge scores
            const { data: studentChallenges, error: scoresError } = await supabase
                .from('student_challenges')
                .select('*')
                .eq('student_id', id);
                
            if (scoresError) throw scoresError;
            
            // Separate compulsory and bonus challenges
            const compulsoryChallenges = challenges.filter(challenge => challenge.type === 'compulsory');
            const bonusChallenges = challenges.filter(challenge => challenge.type === 'bonus');
            
            // Check if student has unlocked bonus challenges
            const hasUnlockedBonus = student.total_points >= 75; // Assuming 75 points threshold to unlock bonus challenges
            
            // Update bonus status display
            if (bonusChallenges.length > 0) {
                if (hasUnlockedBonus) {
                    bonusStatusElement.textContent = 'Bonus Challenges Unlocked!';
                    bonusStatusElement.classList.add('bonus-unlocked');
                } else {
                    bonusStatusElement.textContent = `Need ${75 - student.total_points} more points to unlock Bonus Challenges`;
                    bonusStatusElement.classList.add('bonus-locked');
                }
            } else {
                bonusStatusElement.textContent = 'No Bonus Challenges Available';
            }
            
            // Display compulsory challenges
            challengeListElement.innerHTML = '';
            compulsoryChallenges.forEach(challenge => {
                const studentChallenge = studentChallenges.find(sc => sc.challenge_id === challenge.id) || { points: 0 };
                
                const challengeItem = document.createElement('div');
                challengeItem.className = 'challenge-item';
                challengeItem.innerHTML = `
                    <div class="challenge-name">${challenge.name}</div>
                    <div class="challenge-score">${studentChallenge.points} / ${challenge.max_points}</div>
                `;
                
                challengeListElement.appendChild(challengeItem);
            });
            
            // Display bonus challenges
            bonusChallengeListElement.innerHTML = '';
            if (hasUnlockedBonus && bonusChallenges.length > 0) {
                bonusChallenges.forEach(challenge => {
                    const studentChallenge = studentChallenges.find(sc => sc.challenge_id === challenge.id) || { points: 0 };
                    
                    const challengeItem = document.createElement('div');
                    challengeItem.className = 'challenge-item';
                    challengeItem.innerHTML = `
                        <div class="challenge-name">${challenge.name}</div>
                        <div class="challenge-score">${studentChallenge.points} / ${challenge.max_points}</div>
                    `;
                    
                    bonusChallengeListElement.appendChild(challengeItem);
                });
            } else if (!hasUnlockedBonus && bonusChallenges.length > 0) {
                bonusChallengeListElement.innerHTML = `
                    <div class="locked-message">Complete more challenges to unlock bonus content!</div>
                `;
            } else {
                bonusChallengeListElement.innerHTML = `
                    <div class="no-data">No bonus challenges available yet.</div>
                `;
            }
        } catch (error) {
            console.error('Error loading student data:', error);
            studentNameElement.textContent = 'Error loading student data';
        }
    }
    
    // Function to initialize real-time updates
    function initializeRealTimeUpdates(id) {
        // Subscribe to changes in the students table for this specific student
        supabase
            .channel(`public:students:id.eq.${id}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'students', filter: `id=eq.${id}` }, 
                () => {
                    loadStudentData(id);
                }
            )
            .subscribe();
            
        // Subscribe to changes in the student_challenges table for this student
        supabase
            .channel(`public:student_challenges:student_id.eq.${id}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'student_challenges', filter: `student_id=eq.${id}` }, 
                () => {
                    loadStudentData(id);
                }
            )
            .subscribe();
    }
});