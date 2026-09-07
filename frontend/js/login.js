// ไม่ต้องระบุ Domain บน Render เพราะเป็น Single Web Service (ใช้ Relative Path ได้เลย)
const API_URL = 'https://website-frontend-jpu0.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const message = document.getElementById('message');
    const submitBtn = form?.querySelector('button[type="submit"]');

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            if (message) message.textContent = '';

            // ปิดการใช้งานปุ่มชั่วคราวขณะรอ Request
            if (submitBtn) submitBtn.disabled = true;

            const userData = { username, password };

            try {
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }

                // บันทึกข้อมูลผู้ใช้และเปลี่ยนหน้า
                localStorage.setItem('user', JSON.stringify(data.user));

                if (message) message.textContent = data.message || 'Login successful!';

                window.location.href = 'dashboard.html';

            } catch (error) {
                console.error('Login error:', error);

                if (message) {
                    message.textContent = error.message || 'Invalid Username/Email or Password';
                }
            } finally {
                // คืนค่าปุ่มให้กดได้ปกติหากเกิด Error
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
});