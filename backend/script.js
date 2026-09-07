const userTable = document.getElementById('userTable');
const totalUsers = document.getElementById('totalUsers');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');

async function deleteUser(userId) {
    const confirmDelete = confirm('Are you sure you want to delete this user?');

    if (!confirmDelete) return;

    try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete user');
        }

        alert(data.message);

        loadUsers(); // refresh table after delete
    } catch (error) {
        console.error('Delete error:', error);
        alert(error.message);
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/users');

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const users = await response.json();

        if (totalUsers) totalUsers.textContent = users.length;
        if (userTable) userTable.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.created_at}</td>
                <td><span class="status">Active</span></td>
                <td><button id = "deleteBtn" onclick="deleteUser(${user.id})">Delete</button></td>
            `;
            if (userTable) userTable.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading users:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setInterval(loadUsers, 3000)

    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadUsers);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            alert('Logout');
        });
    }
});