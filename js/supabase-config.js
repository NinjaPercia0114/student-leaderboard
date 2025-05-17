// Supabase configuration
const SUPABASE_URL = 'https://mokdmpujpyxdlgkyhnna.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2RtcHVqcHl4ZGxna3lobm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTI0MzUsImV4cCI6MjA2Mjk2ODQzNX0.YVfzpwDBDYIaaN1v8Tt7nVXzwNi7cQ_8FNwvrCbjMmE';

let supabase;

try {
  // Use globalThis to access Supabase from the loaded script
  supabase = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log("✅ Supabase initialized successfully");
} catch (error) {
  console.error("❌ Error initializing Supabase:", error);
  document.addEventListener('DOMContentLoaded', () => {
    const body = document.querySelector('body');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'connection-error';
    errorDiv.innerHTML = `
      <div class="error-message">
        <h3>Connection Error</h3>
        <p>Failed to connect to the database. Please check your configuration.</p>
        <p>Error details: ${error.message}</p>
      </div>
    `;
    body.prepend(errorDiv);
  });
}


// Helper function to check if a query was successful
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

// Function to show toast notifications
function showToast(type, message) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Show the toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hide and remove the toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}