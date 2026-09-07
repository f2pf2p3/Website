// Dynamic API URL: สลับระหว่าง Localhost กับ Render ตามโดเมนที่รันอยู่
const API_URL = (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://your-backend-service.onrender.com'; // ใส่ URL Backend บน Render ของคุณที่นี่

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const message = document.getElementById('message');

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            // ล้างข้อความแจ้งเตือนเดิมก่อนเริ่มส่ง Request
            if (message) message.textContent = '';

            const userData = {
                username: username,
                password: password
            };

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

                console.log('Login result:', data);

                // บันทึกข้อมูลผู้ใช้ลง localStorage
                localStorage.setItem('user', JSON.stringify(data.user));

                if (message) message.textContent = data.message;

                // ย้ายหน้าไปยัง dashboard.html
                window.location.href = 'dashboard.html';

            } catch (error) {
                console.error('Login error:', error);

                // แสดงข้อความที่ได้จาก Backend หรือ fallback ข้อความเริ่มต้น
                if (message) {
                    message.textContent = error.message || 'Invalid Username/Email or Password';
                }
            }
        });
    }
});