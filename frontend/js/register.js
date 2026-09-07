// Dynamic API URL: สลับระหว่าง Localhost กับ Render ตามโดเมนที่รันอยู่
const API_URL = (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://your-backend-service.onrender.com'; // ใส่ URL Backend บน Render ของคุณที่นี่

document.addEventListener('DOMContentLoaded', () => {
    const username = document.getElementById("username");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const button = document.getElementById("registerBtn");
    const message = document.getElementById("message"); // ( Optional) แสดงข้อความบนหน้าเว็บ

    if (button) {
        button.addEventListener("click", async function (e) {
            e.preventDefault(); // ป้องกันไม่ให้ Form รีโหลดหน้าเว็บ

            // 1. ตรวจสอบการกรอกข้อมูลเบื้องต้น
            if (!username.value || !email.value || !password.value || !confirmPassword.value) {
                alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
                return;
            }

            // 2. ตรวจสอบความยาวรหัสผ่าน (ขั้นต่ำ 8 ตัวอักษร)
            if (password.value.length < 8) {
                alert("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
                return;
            }

            // 3. ตรวจสอบความตรงกันของรหัสผ่าน
            if (password.value !== confirmPassword.value) {
                console.error("Password mismatch!");
                alert("รหัสผ่านยืนยันไม่ตรงกัน");
                return;
            }

            // 4. เตรียมข้อมูลส่งไปยัง Backend API
            const userData = {
                username: username.value.trim(),
                email: email.value.trim(),
                password: password.value
            };

            try {
                const response = await fetch(`${API_URL}/api/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }

                console.log('ผลลัพธ์จากเซิร์ฟเวอร์:', data);
                alert(data.message || "สมัครสมาชิกสำเร็จ!");

                // ย้ายไปยังหน้า Login เมื่อสมัครสำเร็จ
                window.location.href = 'login.html';

            } catch (error) {
                console.error('Registration Error:', error);
                alert(error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
                if (message) {
                    message.textContent = error.message;
                }
            }
        });
    }
});