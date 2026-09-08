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
    document.getElementById('username').textContent = user.username;
    document.getElementById('userUsername').textContent = user.username;
    document.getElementById('userEmail').textContent = user.email || 'Not provided';
    document.getElementById('userId').textContent = user.id;
}

async function loadOrders(token) {
    const response = await fetch(`${API_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Could not load order history');
    const { orders } = await response.json();
    const list = document.getElementById('ordersList');
    list.innerHTML = orders.length ? orders.map((order) => `<article class="order-row"><div><strong>${order.id}</strong><span>${new Date(order.createdAt).toLocaleDateString()}</span></div><div><span class="order-status">${order.status}</span><strong>$${Number(order.total).toFixed(2)}</strong></div></article>`).join('') : '<p class="empty-state">Your first order is still waiting to happen.</p>';
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        logout('Please log in first.');
        return;
    }

    try {
        await verifyUser(token);
        await loadOrders(token);
    } catch (error) {
        console.error('User verification failed:', error);
        logout(error.message);
        return;
    }

    document.getElementById('logoutBtn')?.addEventListener('click', () => logout());
    document.getElementById('logoutBtn2')?.addEventListener('click', () => logout());
});
