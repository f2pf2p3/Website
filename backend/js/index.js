const API_URL = '';
const userTable = document.getElementById('userTable');
const totalUsers = document.getElementById('totalUsers');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');

function getToken() {
    const query = new URLSearchParams(window.location.search);
    const queryToken = query.get('token');

    if (queryToken) {
        localStorage.setItem('token', queryToken);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    return localStorage.getItem('token');
}

function logout(message) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    if (message) alert(message);
    window.location.href = 'login.html';
}

async function request(path, options = {}) {
    const token = getToken();
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401 || response.status === 403) {
        logout('Your admin session has expired.');
        throw new Error('Unauthorized');
    }

    return response;
}

async function loadUsers() {
    try {
        const response = await request('/api/users');
        if (!response.ok) throw new Error('Could not load users');

        const users = await response.json();
        totalUsers.textContent = users.length;
        userTable.replaceChildren();

        users.forEach((user) => {
            const row = document.createElement('tr');
            [user.id, user.username, user.email, user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : 'N/A'].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            });

            const statusCell = document.createElement('td');
            statusCell.textContent = user.role === 'admin' ? 'Admin' : 'Active';
            row.appendChild(statusCell);

            const actionCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Delete';
            deleteButton.disabled = user.id === 0;
            deleteButton.addEventListener('click', () => deleteUser(user.id));
            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);
            userTable.appendChild(row);
        });
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('Loading users failed:', error);
        }
    }
}

async function deleteUser(userId) {
    if (!window.confirm('Delete this user?')) return;

    try {
        const response = await request(`/api/users/${userId}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Delete failed');
        await loadUsers();
    } catch (error) {
        if (error.message !== 'Unauthorized') alert(error.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = getToken();
    if (!token) {
        logout('Please log in first.');
        return;
    }

    try {
        const response = await request('/api/me');
        const data = await response.json();
        if (data.user?.role !== 'admin') {
            logout('Administrator access is required.');
            return;
        }
        document.getElementById('adminName').textContent = data.user.username;
        await loadUsers();
    } catch (error) {
        if (error.message !== 'Unauthorized') logout('Could not verify your session.');
        return;
    }

    refreshBtn.addEventListener('click', loadUsers);
    logoutBtn.addEventListener('click', () => logout());
});
