// Dynamic API URL: สลับระหว่าง Localhost กับ Render ตามโดเมนที่รันอยู่
const API_URL = (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://website-backend-70pc.onrender.com'; // ใส่ URL Backend บน Render ของคุณที่นี่

const userTable = document.getElementById('userTable');
const totalUsers = document.getElementById('totalUsers');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');

// ฟังก์ชันลบผู้ใช้งาน
async function deleteUser(userId) {
    const confirmDelete = confirm('Are you sure you want to delete this user?');

    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_URL}/api/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete user');
        }

        alert(data.message || 'User deleted successfully');

        // รีโหลดรายการผู้ใช้ทันทีเมื่อลบสำเร็จ
        loadUsers(); 
    } catch (error) {
        console.error('Delete error:', error);
        alert(error.message);
    }
}

// ฟังก์ชันดึงข้อมูลผู้ใช้งานทั้งหมดมาแสดงบนตาราง
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/api/users`);

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const users = await response.json();

        if (totalUsers) totalUsers.textContent = users.length;
        if (userTable) userTable.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            
            // Format วันที่ให้ดูง่ายขึ้น ( optional )
            const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${createdAt}</td>
                <td><span class="status">Active</span></td>
                <td><button class="delete-btn">Delete</button></td>
            `;

            // ผูก Event Listener ปลอดภัยจากการโจมตีประเภท XSS
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteUser(user.id));

            if (userTable) userTable.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// เริ่มต้นการทำงานเมื่อ DOM โหลดเสร็จสิ้น
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    // ดึงข้อมูลใหม่อัตโนมัติทุกๆ 5 วินาที
    setInterval(loadUsers, 5000);

    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadUsers);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user');
            alert('Logged out successfully');
            window.location.href = 'login.html';
        });
    }
});