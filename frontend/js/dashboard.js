// Dynamic API URL: สลับระหว่าง Localhost กับ Render ตามโดเมนที่รันอยู่
const API_URL = (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://your-backend-service.onrender.com'; // Replace with your actual Render Backend URL

// Get saved user
const savedUser = localStorage.getItem('user');

// No user saved
if (!savedUser) {
    window.location.href = 'login.html';
} else {
    const user = JSON.parse(savedUser);
    verifyUser(user.id);
}

// ========================================
// Verify User With Database
// ========================================
async function verifyUser(userId) {
    try {
        const response = await fetch(`${API_URL}/api/users/${userId}`);

        // User does not exist or error
        if (!response.ok) {
            localStorage.removeItem('user');
            alert('Your account no longer exists.');
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();

        // ดึงข้อมูล user รองรับทั้งแบบส่งกลับมาเป็น { user: {...} } หรือ object ตรงๆ
        const user = data.user || data;

        // Update localStorage with fresh database data
        localStorage.setItem('user', JSON.stringify(user));

        // Display username & user details (ใส่ Optional Chaining กัน Error Element ไม่พบ)
        const displayName = document.getElementById('displayName');
        const usernameEl = document.getElementById('username');
        const userUsername = document.getElementById('userUsername');
        const userEmail = document.getElementById('userEmail');
        const userIdEl = document.getElementById('userId');

        if (displayName) displayName.textContent = user.username;
        if (usernameEl) usernameEl.textContent = user.username;
        if (userUsername) userUsername.textContent = user.username;
        if (userEmail) userEmail.textContent = user.email;
        if (userIdEl) userIdEl.textContent = user.id;

    } catch (error) {
        console.error('User verification error:', error);
        alert('Cannot connect to server.');
    }
}

// ========================================
// Logout
// ========================================
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ผูก Event Listener เมื่อ DOM โหลดเสร็จสิ้น (ป้องกัน Error Element หาไม่เจอ)
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtn2 = document.getElementById('logoutBtn2');

    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (logoutBtn2) logoutBtn2.addEventListener('click', logout);
});