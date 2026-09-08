const API_URL = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://website-backend-70pc.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const authButtons = document.querySelector('.auth-buttons');
    let user = null;

    if (token) {
        try {
            const res = await fetch(`${API_URL}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                user = data.user; // ✅ correctly unwrapped
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
            }
        } catch (error) {
            console.error("Auth check failed:", error);
        }
    }

    if (authButtons) {
        if (user) {
            authButtons.innerHTML = `
                <a href="dashboard.html" class="login-btn" id="usernameLink"></a>
                <button id="logoutBtn" class="register-btn">Logout</button>
            `;
            document.getElementById('usernameLink').textContent = user.username;
            document.getElementById('logoutBtn').addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                window.location.href = 'index.html';
            });
        } else {
            authButtons.innerHTML = `
                <a href="login.html" class="login-btn">Login</a>
                <a href="register.html" class="register-btn">Register</a>
            `;
        }

        authButtons.style.visibility = 'visible';
    }
});