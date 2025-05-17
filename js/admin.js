
document.addEventListener('DOMContentLoaded', async () => {
    // Check if Supabase client is initialized
    if (!supabase) {
        showError("Supabase client not initialized. Please check your configuration.");
        return;
    }

    // Debounce utility to prevent rapid re-triggering
    function debounce(func, delay = 300) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }



    // DOM Elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const addStudentBtn = document.getElementById('add-student-btn');
    const addChallengeBtn = document.getElementById('add-challenge-btn');
    const studentModal = document.getElementById('student-modal');
    const challengeModal = document.getElementById('challenge-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const studentForm = document.getElementById('student-form');
    const challengeForm = document.getElementById('challenge-form');
    const adminStudentList = document.getElementById('admin-student-list');
    const compulsoryChallengesList = document.getElementById('compulsory-challenges-list');
    const bonusChallengesList = document.getElementById('bonus-challenges-list');
    const challengeScoresContainer = document.getElementById('challenge-scores-container');
    const challengeTypeInput = document.getElementById('challenge-type-input');
    const bonusThresholdGroup = document.getElementById('bonus-threshold-group');
    
    // Current student/challenge being edited
    let currentStudentId = null;
    let currentChallengeId = null;
    
    // Initialize real-time updates
    initializeRealTimeUpdates();
    
    // Define executeSupabaseQuery function directly in this file
    async function executeSupabaseQuery(queryFunction) {
        try {
            const result = await queryFunction();
            
            if (result.error) {
                console.error("Supabase query error:", result.error);
                throw result.error;
            }
            
            return result.data;
        } catch (error) {
            console.error("Supabase query error:", error);
            throw error;
        }
    }
    
    // Load initial data
    try {
        await loadStudents();
        await loadChallenges();
    } catch (error) {
        console.error("Failed to load initial data:", error);
        showError("Failed to load data from the database. Please refresh the page or check your connection.");
    }
    
    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show selected tab content
            tabContents.forEach(content => {
                if (content.id === `${tabName}-tab`) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });
    
    // Modal functionality
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => openStudentModal());
    }
    
    if (addChallengeBtn) {
        addChallengeBtn.addEventListener('click', () => openChallengeModal());
    }
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            studentModal.style.display = 'none';
            challengeModal.style.display = 'none';
        });
    });
    
    // Challenge type change handler
    if (challengeTypeInput) {
        challengeTypeInput.addEventListener('change', () => {
            if (challengeTypeInput.value === 'bonus') {
                bonusThresholdGroup.classList.remove('hidden');
            } else {
                bonusThresholdGroup.classList.add('hidden');
            }
        });
    }
    
    // Form submissions
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentFormSubmit);
    }
    
    if (challengeForm) {
        challengeForm.addEventListener('submit', handleChallengeFormSubmit);
    }
    
    // Window click to close modal
    window.addEventListener('click', (event) => {
        if (event.target === studentModal) {
            studentModal.style.display = 'none';
        } else if (event.target === challengeModal) {
            challengeModal.style.display = 'none';
        }
    });
    
    // Function to load all students
    async function loadStudents() {
        try {
            adminStudentList.innerHTML = '<div class="loading">Loading students...</div>';
            
            // Fetch students ordered by name
            const { data: students, error } = await supabase
                .from('students')
                .select('*')
                .order('name');
                
            if (error) throw error;
            
            // Clear the loading message
            adminStudentList.innerHTML = '';
            
            // Generate the student list
            students.forEach(student => {
                const studentItem = document.createElement('div');
                studentItem.className = 'admin-student-item';
                studentItem.innerHTML = `
                    <div class="admin-student-info">
                        <div class="student-admin-name">${student.name}</div>
                        <div class="student-admin-points">${student.total_points} points</div>
                    </div>
                    <div class="admin-student-actions">
                        <button class="action-btn edit-btn" data-id="${student.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn delete-btn" data-id="${student.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;
                
                // Add event listeners for edit and delete buttons
                const editBtn = studentItem.querySelector('.edit-btn');
                const deleteBtn = studentItem.querySelector('.delete-btn');
                
                editBtn.addEventListener('click', () => openStudentModal(student.id));
                deleteBtn.addEventListener('click', () => deleteStudent(student.id));
                
                adminStudentList.appendChild(studentItem);
            });
            
            // If no students were found
            if (students.length === 0) {
                adminStudentList.innerHTML = `
                    <div class="no-data">No students found. Add a student to get started.</div>
                `;
            }
        } catch (error) {
            console.error('Error loading students:', error);
            adminStudentList.innerHTML = `
                <div class="error">Error loading student data. Please try again.</div>
            `;
        }
    }
    
    // Function to open the student modal
    async function openStudentModal(studentId = null) {
        currentStudentId = studentId;
        const studentNameInput = document.getElementById('student-name-input');
        const studentModalTitle = document.getElementById('student-modal-title');
        
        // Reset the form
        studentForm.reset();
        challengeScoresContainer.innerHTML = '';
        
        if (studentId) {
            // Editing an existing student
            studentModalTitle.textContent = 'Edit Student';
            
            try {
                // Fetch student data
                const { data: student, error: studentError } = await supabase
                    .from('students')
                    .select('*')
                    .eq('id', studentId)
                    .single();
                    
                if (studentError) throw studentError;
                
                // Fill the form with student data
                studentNameInput.value = student.name;
                
                // Fetch all challenges
                const { data: challenges, error: challengesError } = await supabase
                    .from('challenges')
                    .select('*')
                    .order('name');
                    
                if (challengesError) throw challengesError;
                
                // Fetch student challenge scores
                const { data: studentChallenges, error: scoresError } = await supabase
                    .from('student_challenges')
                    .select('*')
                    .eq('student_id', studentId);
                    
                if (scoresError) throw scoresError;
                
                // Show challenge scores container
                challengeScoresContainer.classList.remove('hidden');
                
                // Generate challenge score inputs
                challenges.forEach(challenge => {
                    const studentChallenge = studentChallenges.find(sc => sc.challenge_id === challenge.id) || { points: 0 };
                    
                    const challengeScoreItem = document.createElement('div');
                    challengeScoreItem.className = 'challenge-score-item';
                    challengeScoreItem.innerHTML = `
                        <div class="challenge-score-name">${challenge.name}</div>
                        <input type="number" 
                               class="challenge-score-input" 
                               name="challenge-${challenge.id}" 
                               value="${studentChallenge.points || 0}" 
                               min="0" 
                               max="${challenge.max_points}" 
                               data-challenge-id="${challenge.id}">
                        <div class="challenge-max-points">/ ${challenge.max_points}</div>
                    `;
                    
                    challengeScoresContainer.appendChild(challengeScoreItem);
                });
                
            } catch (error) {
                console.error('Error fetching student data:', error);
                alert('Error loading student data. Please try again.');
                return;
            }
        } else {
            // Adding a new student
            studentModalTitle.textContent = 'Add New Student';
            challengeScoresContainer.classList.add('hidden');
        }
        
        // Display the modal
        studentModal.style.display = 'block';
    }
    
    // Function to handle student form submission
    async function handleStudentFormSubmit(event) {
        event.preventDefault();
        
        const studentNameInput = document.getElementById('student-name-input');
        const studentName = studentNameInput.value.trim();
        
        if (!studentName) {
            alert('Please enter a student name.');
            return;
        }
        
        try {
            if (currentStudentId) {
                // Update existing student
                const { error } = await supabase
                    .from('students')
                    .update({ name: studentName })
                    .eq('id', currentStudentId);
                    
                if (error) throw error;
                
                // Update challenge scores
                const challengeScoreInputs = document.querySelectorAll('.challenge-score-input');
                for (const input of challengeScoreInputs) {
                    const challengeId = input.getAttribute('data-challenge-id');
                    const points = parseInt(input.value) || 0;
                    
                    // Check if the student_challenge record exists
                    const { data, error: checkError } = await supabase
                        .from('student_challenges')
                        .select('id')
                        .eq('student_id', currentStudentId)
                        .eq('challenge_id', challengeId)
                        .maybeSingle();
                        
                    if (checkError) throw checkError;
                    
                    if (data) {
                        // Update existing record
                        const { error: updateError } = await supabase
                            .from('student_challenges')
                            .update({ points })
                            .eq('id', data.id);
                            
                        if (updateError) throw updateError;
                    } else {
                        // Insert new record
                        const { error: insertError } = await supabase
                            .from('student_challenges')
                            .insert({
                                student_id: currentStudentId,
                                challenge_id: challengeId,
                                points
                            });
                            
                        if (insertError) throw insertError;
                    }
                }
                
                // Update total points for the student
                await updateStudentTotalPoints(currentStudentId);
                
                alert('Student updated successfully!');
                
            } else {
                // Add new student
                const { data, error } = await supabase
                    .from('students')
                    .insert({
                        name: studentName,
                        total_points: 0
                    })
                    .select();
                    
                if (error) throw error;
                
                alert('Student added successfully!');
            }
            
            // Close the modal and reload the student list
            studentModal.style.display = 'none';
            await loadStudents();
            
        } catch (error) {
            console.error('Error saving student:', error);
            alert(`Error saving student data: ${error.message || 'Unknown error'}. Please try again.`);
        }
    }
    
    // Function to update a student's total points
    async function updateStudentTotalPoints(studentId) {
        try {
            // Calculate total points from student_challenges
            const { data, error } = await supabase
                .from('student_challenges')
                .select(`
                    points,
                    challenges:challenge_id (max_points)
                `)
                .eq('student_id', studentId);
                
            if (error) throw error;
            
            // Sum up the points
            let totalPoints = 0;
            data.forEach(sc => {
                totalPoints += Math.min(sc.points || 0, sc.challenges?.max_points || 0);
            });
            
            // Update the student's total_points
            const { error: updateError } = await supabase
                .from('students')
                .update({ total_points: totalPoints })
                .eq('id', studentId);
                
            if (updateError) throw updateError;
            
            return totalPoints;
        } catch (error) {
            console.error('Error updating student total points:', error);
            throw error;
        }
    }
    
    // Function to delete a student
    async function deleteStudent(studentId) {
        if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            return;
        }
        
        try {
            // Delete student_challenges records first
            const { error: scError } = await supabase
                .from('student_challenges')
                .delete()
                .eq('student_id', studentId);
                
            if (scError) throw scError;
            
            // Delete the student
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('id', studentId);
                
            if (error) throw error;
            
            alert('Student deleted successfully.');
            
            // Reload the student list
            await loadStudents();
            
        } catch (error) {
            console.error('Error deleting student:', error);
            alert(`Error deleting student: ${error.message || 'Unknown error'}. Please try again.`);
        }
    }
    
    // Function to initialize real-time updates
    function initializeRealTimeUpdates() {
        try {
            // Subscribe to changes in the students table
            const studentsChannel = supabase
                .channel('public:students')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'students' }, 
                    () => {
                        debouncedLoadStudents();
                    }
                )
                .subscribe((status) => {
                    console.log('Students channel status:', status);
                });
                
            // Subscribe to changes in the challenges table
            const challengesChannel = supabase
                .channel('public:challenges')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'challenges' }, 
                    () => {
                        loadChallenges();
                    }
                )
                .subscribe((status) => {
                    console.log('Challenges channel status:', status);
                });
                
            // Subscribe to changes in the student_challenges table
            const scChannel = supabase
                .channel('public:student_challenges')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'student_challenges' }, 
                    () => {
                        loadStudents();
                    }
                )
                .subscribe((status) => {
                    console.log('Student challenges channel status:', status);
                });
        } catch (error) {
            console.error('Error setting up real-time updates:', error);
        }
    }
    
    // Function to load all challenges
    async function loadChallenges() {
        try {
            if (!compulsoryChallengesList || !bonusChallengesList) {
                return; // Not on challenges tab
            }
            
            compulsoryChallengesList.innerHTML = '<div class="loading">Loading challenges...</div>';
            bonusChallengesList.innerHTML = '';
            
            // Fetch challenges ordered by name
            const { data: challenges, error } = await supabase
                .from('challenges')
                .select('*')
                .order('name');
                
            if (error) throw error;
            
            // Clear the lists
            compulsoryChallengesList.innerHTML = '';
            bonusChallengesList.innerHTML = '';
            
            // Separate challenges by type
            const compulsoryChallenges = challenges.filter(c => c.type === 'compulsory');
            const bonusChallenges = challenges.filter(c => c.type === 'bonus');
            
            // Generate the compulsory challenges list
            compulsoryChallenges.forEach(challenge => {
                const challengeItem = createChallengeItem(challenge);
                compulsoryChallengesList.appendChild(challengeItem);
            });
            
            // Generate the bonus challenges list
            bonusChallenges.forEach(challenge => {
                const challengeItem = createChallengeItem(challenge);
                bonusChallengesList.appendChild(challengeItem);
            });
            
            // If no challenges were found
            if (compulsoryChallenges.length === 0) {
                compulsoryChallengesList.innerHTML = `
                    <div class="no-data">No compulsory challenges found. Add a challenge to get started.</div>
                `;
            }
            
            if (bonusChallenges.length === 0) {
                bonusChallengesList.innerHTML = `
                    <div class="no-data">No bonus challenges found.</div>
                `;
            }
        } catch (error) {
            console.error('Error loading challenges:', error);
            compulsoryChallengesList.innerHTML = `
                <div class="error">Error loading challenge data. Please try again.</div>
            `;
            bonusChallengesList.innerHTML = '';
        }
    }
    const debouncedLoadStudents = debounce(loadStudents, 500);
    const debouncedLoadChallenges = debounce(loadChallenges, 500);


    // Helper function to create a challenge item
    function createChallengeItem(challenge) {
        const challengeItem = document.createElement('div');
        challengeItem.className = 'admin-challenge-item';
        
        let thresholdText = '';
        if (challenge.type === 'bonus' && challenge.threshold) {
            thresholdText = `<div class="challenge-threshold">Requires ${challenge.threshold} points</div>`;
        }
        
        challengeItem.innerHTML = `
            <div class="admin-challenge-info">
                <div class="challenge-admin-name">${challenge.name}</div>
                <div class="challenge-admin-points">Max points: ${challenge.max_points}</div>
                ${thresholdText}
            </div>
            <div class="admin-challenge-actions">
                <button class="action-btn edit-btn" data-id="${challenge.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" data-id="${challenge.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        // Add event listeners for edit and delete buttons
        const editBtn = challengeItem.querySelector('.edit-btn');
        const deleteBtn = challengeItem.querySelector('.delete-btn');
        
        editBtn.addEventListener('click', () => openChallengeModal(challenge.id));
        deleteBtn.addEventListener('click', () => deleteChallenge(challenge.id));
        
        return challengeItem;
    }

    // Function to open the challenge modal
    async function openChallengeModal(challengeId = null) {
        currentChallengeId = challengeId;
        const challengeNameInput = document.getElementById('challenge-name-input');
        const challengePointsInput = document.getElementById('challenge-points-input');
        const challengeTypeInput = document.getElementById('challenge-type-input');
        const bonusThresholdInput = document.getElementById('bonus-threshold-input');
        const challengeModalTitle = document.getElementById('challenge-modal-title');
        
        // Reset the form
        challengeForm.reset();
        
        if (challengeId) {
            // Editing an existing challenge
            challengeModalTitle.textContent = 'Edit Challenge';
            
            try {
                // Fetch challenge data
                const { data: challenge, error } = await supabase
                    .from('challenges')
                    .select('*')
                    .eq('id', challengeId)
                    .single();
                    
                if (error) throw error;
                
                // Fill the form with challenge data
                challengeNameInput.value = challenge.name;
                challengePointsInput.value = challenge.max_points;
                challengeTypeInput.value = challenge.type;
                
                if (challenge.type === 'bonus') {
                    bonusThresholdGroup.classList.remove('hidden');
                    bonusThresholdInput.value = challenge.threshold || '';
                } else {
                    bonusThresholdGroup.classList.add('hidden');
                }
                
            } catch (error) {
                console.error('Error fetching challenge data:', error);
                alert('Error loading challenge data. Please try again.');
                return;
            }
        } else {
            // Adding a new challenge
            challengeModalTitle.textContent = 'Add New Challenge';
            bonusThresholdGroup.classList.add('hidden');
        }
        
        // Display the modal
        challengeModal.style.display = 'block';
    }

    // Function to handle challenge form submission
    async function handleChallengeFormSubmit(event) {
        event.preventDefault();
        
        const challengeNameInput = document.getElementById('challenge-name-input');
        const challengePointsInput = document.getElementById('challenge-points-input');
        const challengeTypeInput = document.getElementById('challenge-type-input');
        const bonusThresholdInput = document.getElementById('bonus-threshold-input');
        
        const challengeName = challengeNameInput.value.trim();
        const maxPoints = parseInt(challengePointsInput.value) || 0;
        const challengeType = challengeTypeInput.value;
        let threshold = null;
        
        if (challengeType === 'bonus') {
            threshold = parseInt(bonusThresholdInput.value) || 0;
        }
        
        if (!challengeName || maxPoints <= 0) {
            alert('Please enter a valid challenge name and points.');
            return;
        }
        
        try {
            if (currentChallengeId) {
                // Update existing challenge
                const { error } = await supabase
                    .from('challenges')
                    .update({
                        name: challengeName,
                        max_points: maxPoints,
                        type: challengeType,
                        threshold
                    })
                    .eq('id', currentChallengeId);
                    
                if (error) throw error;
                
                // Update student total points in case max_points changed
                await updateAllStudentsTotalPoints();
                
                alert('Challenge updated successfully!');
                
            } else {
                // Add new challenge
                const { error } = await supabase
                    .from('challenges')
                    .insert({
                        name: challengeName,
                        max_points: maxPoints,
                        type: challengeType,
                        threshold
                    });
                    
                if (error) throw error;
                
                alert('Challenge added successfully!');
            }
            
            // Close the modal and reload the challenge list
            challengeModal.style.display = 'none';
            await loadChallenges();
            
        } catch (error) {
            console.error('Error saving challenge:', error);
            alert(`Error saving challenge data: ${error.message || 'Unknown error'}. Please try again.`);
        }
    }

    // Function to delete a challenge
    async function deleteChallenge(challengeId) {
        if (!confirm('Are you sure you want to delete this challenge? This will remove all associated student scores.')) {
            return;
        }
        
        try {
            // Delete student_challenges records first
            const { error: scError } = await supabase
                .from('student_challenges')
                .delete()
                .eq('challenge_id', challengeId);
                
            if (scError) throw scError;
            
            // Delete the challenge
            const { error } = await supabase
                .from('challenges')
                .delete()
                .eq('id', challengeId);
                
            if (error) throw error;
            
            // Update all students' total points
            await updateAllStudentsTotalPoints();
            
            alert('Challenge deleted successfully.');
            
            // Reload the challenge list
            await loadChallenges();
            
        } catch (error) {
            console.error('Error deleting challenge:', error);
            alert(`Error deleting challenge: ${error.message || 'Unknown error'}. Please try again.`);
        }
    }

    // Function to update all students' total points
    async function updateAllStudentsTotalPoints() {
        try {
            // Fetch all students
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id');
                
            if (studentsError) throw studentsError;
            
            // Update each student's total points
            for (const student of students) {
                await updateStudentTotalPoints(student.id);
            }
            
        } catch (error) {
            console.error('Error updating all students total points:', error);
            throw error;
        }
    }

    // Helper function to show error messages
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
        document.body.prepend(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }
});