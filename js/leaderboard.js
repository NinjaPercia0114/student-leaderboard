
document.addEventListener('DOMContentLoaded', async () => {
    const leaderboardContent = document.getElementById('leaderboard-content');
    
    // Initialize real-time subscription for students table
    initializeRealTimeUpdates();
    
    // Load initial leaderboard data
    await loadLeaderboard();
    
    // Function to load leaderboard data
    async function loadLeaderboard() {
        try {
            // Fetch students ordered by total points in descending order
            const { data: students, error } = await supabase
                .from('students')
                .select('id, name, total_points')
                .order('total_points', { ascending: false });
                
            if (error) throw error;
            
            // Clear the loading message
            leaderboardContent.innerHTML = '';
            
            // Generate the leaderboard content
            students.forEach((student, index) => {
                const rank = index + 1;
                const row = document.createElement('div');
                row.className = 'student-row';
                row.setAttribute('data-id', student.id);
                
                // Calculate progress percentage (assuming max points is 150 for 15 challenges with 10 points each)
                const maxPoints = 150; // This could be fetched from the database
                const progressPercentage = Math.min(Math.round((student.total_points / maxPoints) * 100), 100);
                
                row.innerHTML = `
                    <div class="rank ${rank <= 3 ? 'top-rank rank-' + rank : ''}">${rank}</div>
                    <div class="student-name">${student.name}</div>
                    <div class="points">${student.total_points}</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progressPercentage}%;"></div>
                    </div>
                `;
                
                // Add click event to navigate to student details
                row.addEventListener('click', () => {
                    window.location.href = `student-details.html?id=${student.id}`;
                });
                
                leaderboardContent.appendChild(row);
            });
            
            // If no students were found
            if (students.length === 0) {
                leaderboardContent.innerHTML = `
                    <div class="no-data">No students found. Add students in the admin panel.</div>
                `;
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            leaderboardContent.innerHTML = `
                <div class="error">Error loading leaderboard data. Please try again.</div>
            `;
        }
    }
    
    // Function to initialize real-time updates
    function initializeRealTimeUpdates() {
        // Subscribe to changes in the students table
        supabase
            .channel('public:students')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'students' }, 
                () => {
                    // Reload the leaderboard when changes occur
                    loadLeaderboard();
                }
            )
            .subscribe();
    }
});