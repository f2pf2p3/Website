const API_URL = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://website-backend-70pc.onrender.com';

function logout(message) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    if (message) alert(message);
    window.location.href = 'login.html';
}

async function verifyUser(token) {
    const response = await fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Session expired');

    const data = await response.json();
    const user = data.user;
    document.getElementById('displayName').textContent = user.username;
    document.getElementById('username').textContent = user.username;
    document.getElementById('userUsername').textContent = user.username;
    document.getElementById('userEmail').textContent = user.email || 'Not provided';
    document.getElementById('userId').textContent = user.id;
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        logout('Please log in first.');
        return;
    }

    try {
        await verifyUser(token);
    } catch (error) {
        console.error('User verification failed:', error);
        logout(error.message);
        return;
    }

    document.getElementById('logoutBtn')?.addEventListener('click', () => logout());
    document.getElementById('logoutBtn2')?.addEventListener('click', () => logout());
});
