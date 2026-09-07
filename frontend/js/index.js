// Dynamic API URL สลับระหว่าง Localhost กับ Render
const API_URL = (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://your-backend-service.onrender.com'; //  ใส่ URL Backend บน Render ของคุณ

document.addEventListener('DOMContentLoaded', async () => {
    // Get logged-in user
    let user = JSON.parse(localStorage.getItem('user'));
    const authButtons = document.querySelector('.auth-buttons');

    if (authButtons) {
        if (user) {
            // (Optional) ตรวจสอบกับ Database ว่าผู้ใช้นี้ยังคงมีอยู่อย่างถูกต้อง
            try {
                const res = await fetch(`${API_URL}/api/users/${user.id}`);
                if (!res.ok) {
                    // หากผู้ใช้โดนลบหรือไม่มีในระบบ ให้ล้าง localStorage
                    localStorage.removeItem('user');
                    user = null;
                }
            } catch (error) {
                console.error("User validation failed:", error);
            }
        }

        if (user) {
            // User is logged in
            authButtons.innerHTML = `
                <a href="dashboard.html" class="login-btn">
                    ${user.username}
                </a>

                <button id="logoutBtn" class="register-btn">
                    Logout
                </button>
            `;

            // Logout ONLY when Logout is clicked
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                });
            }

        } else {
            // User is not logged in
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