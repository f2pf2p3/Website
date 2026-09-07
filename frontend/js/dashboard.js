// Dynamic API URL: สลับระหว่าง Localhost กับ Render ตามโดเมนที่รันอยู่
const API_URL = (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://website-backend-70pc.onrender.com'; // ใส่ URL Backend บน Render ของคุณที่นี่

// 1. ตรวจสอบ User ใน LocalStorage
const savedUser = localStorage.getItem('user');

if (!savedUser) {
    window.location.href = 'login.html';
} else {
    try {
        const user = JSON.parse(savedUser);
        if (user && user.id) {
            verifyUser(user.id);
        } else {
            logout();
        }
    } catch (e) {
        console.error("Invalid JSON in localStorage", e);
        logout();
    }
}

// 2. ดึงข้อมูลล่าสุดจาก Database มายืนยันตัวตน
async function verifyUser(userId) {
    try {
        const response = await fetch(`${API_URL}/api/users/${userId}`);

        // ถ้า User โดนลบ หรือดึงข้อมูลไม่ได้ ให้ล้าง Session แล้วเตะออกไปหน้า Login
        if (!response.ok) {
            alert('Your account no longer exists.');
            logout();
            return;
        }

        const data = await response.json();
        const user = data.user || data;

        // อัปเดตข้อมูลสดใหม่ลง LocalStorage
        localStorage.setItem('user', JSON.stringify(user));

        // นำข้อมูลไปแปะแสดงผลบน HTML
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

// 3. ฟังก์ชัน Logout
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// 4. ผูก Event Listener เมื่อ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtn2 = document.getElementById('logoutBtn2');

    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (logoutBtn2) logoutBtn2.addEventListener('click', logout);
});