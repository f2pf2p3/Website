// Dynamic API URL: สลับระหว่าง Localhost กับ Render ตามโดเมนที่รันอยู่
const API_URL = (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://website-backend-70pc.onrender.com'; // ใส่ URL Backend บน Render ของคุณที่นี่

document.addEventListener('DOMContentLoaded', async () => {
    // 1. ดึงข้อมูล User และป้องกัน JSON Parse Error
    let user = null;
    try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) user = JSON.parse(savedUser);
    } catch (e) {
        console.error("Invalid JSON in localStorage", e);
        localStorage.removeItem('user');
    }

    const authButtons = document.querySelector('.auth-buttons');

    if (authButtons) {
        // 2. ตรวจสอบข้อมูลกับ Database
        if (user && user.id) {
            try {
                const res = await fetch(`${API_URL}/api/users/${user.id}`);
                if (!res.ok) {
                    localStorage.removeItem('user');
                    user = null;
                }
            } catch (error) {
                console.error("User validation failed:", error);
            }
        }

        // 3. แสดงผล UI ปุ่ม Login / Register หรือ Profile
        if (user) {
            authButtons.innerHTML = `
                <a href="dashboard.html" class="login-btn">
                    ${user.username}
                </a>
                <button id="logoutBtn" class="register-btn">
                    Logout
                </button>
            `;

            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                });
            }

        } else {
            authButtons.innerHTML = `
                <a href="login.html" class="login-btn">
                    Login
                </a>
                <a href="register.html" class="register-btn">
                    Register
                </a>
            `;
        }
    }
});