// ไม่ต้องระบุ Domain บน Render เพราะเป็น Single Web Service (ใช้ Relative Path ได้เลย)
const API_URL = 'https://website-frontend-jpu0.onrender.com';

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