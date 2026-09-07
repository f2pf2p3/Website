// ============================================================
// API CONFIGURATION
// ============================================================


const API_URL = 'https://website-frontend-jpu0.onrender.com';


// ============================================================
// WAIT FOR HTML
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // ========================================================
    // GET HTML ELEMENTS
    // ========================================================

    // Username input
    const username = document.getElementById('username');

    // Email input
    const email = document.getElementById('email');

    // Password input
    const password = document.getElementById('password');

    // Confirm password input
    const confirmPassword =
        document.getElementById('confirmPassword');

    // Register button
    const button =
        document.getElementById('registerBtn');

    // Message element
    const message =
        document.getElementById('message');


    // ========================================================
    // CHECK REGISTER BUTTON
    // ========================================================

    // ถ้าไม่พบปุ่ม Register ให้หยุดทำงาน
    if (!button) {
        console.error('registerBtn not found');
        return;
    }


    // ========================================================
    // REGISTER BUTTON
    // ========================================================

    button.addEventListener('click', async function (e) {

        // ป้องกัน Form submit
        e.preventDefault();


        // ====================================================
        // VALIDATE INPUT
        // ====================================================

        // ตรวจสอบว่ากรอกข้อมูลครบ
        if (
            !username.value ||
            !email.value ||
            !password.value ||
            !confirmPassword.value
        ) {
            alert('กรุณากรอกข้อมูลให้ครบทุกช่อง');
            return;
        }


        // ====================================================
        // VALIDATE PASSWORD LENGTH
        // ====================================================

        // Password ต้องอย่างน้อย 8 ตัว
        if (password.value.length < 8) {
            alert('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
            return;
        }


        // ====================================================
        // VALIDATE PASSWORD MATCH
        // ====================================================

        // ตรวจสอบ Password กับ Confirm Password
        if (password.value !== confirmPassword.value) {
            alert('รหัสผ่านยืนยันไม่ตรงกัน');
            return;
        }


        // ====================================================
        // DISABLE BUTTON
        // ====================================================

        // ป้องกันกดปุ่มซ้ำ
        button.disabled = true;


        // ====================================================
        // PREPARE DATA
        // ====================================================

        // ข้อมูลที่จะส่งไป Backend
        const userData = {
            username: username.value.trim(),
            email: email.value.trim(),
            password: password.value
        };


        // ====================================================
        // SEND REQUEST
        // ====================================================

        try {

            // เรียก Render Backend
            // เช่น https://your-app.onrender.com/api/register
            const response = await fetch(
                `${API_URL}/api/register`,
                {
                    // ใช้ POST
                    method: 'POST',

                    // ระบุว่าเป็น JSON
                    headers: {
                        'Content-Type': 'application/json'
                    },

                    // ส่งข้อมูล User
                    body: JSON.stringify(userData)
                }
            );


            // ====================================================
            // READ RESPONSE
            // ====================================================

            // อ่านเป็น text ก่อน
            // เพื่อป้องกัน Unexpected token '<'
            const responseText = await response.text();

            // Debug: ดูว่า Render ส่งอะไรกลับมา
            console.log('Status:', response.status);
            console.log('Response:', responseText);


            // ====================================================
            // PARSE JSON
            // ====================================================

            let data;

            try {

                // แปลง Response เป็น JSON
                data = JSON.parse(responseText);

            } catch (jsonError) {

                // Server ส่ง HTML หรือข้อมูลที่ไม่ใช่ JSON
                console.error(
                    'Server returned non-JSON response:',
                    responseText
                );

                throw new Error(
                    `Server returned ${response.status} instead of JSON`
                );
            }


            // ====================================================
            // CHECK HTTP STATUS
            // ====================================================

            // ถ้า API ส่ง Error
            if (!response.ok) {
                throw new Error(
                    data.message || 'Registration failed'
                );
            }


            // ====================================================
            // REGISTER SUCCESS
            // ====================================================

            // แสดงข้อความสำเร็จ
            alert(
                data.message ||
                'สมัครสมาชิกสำเร็จ!'
            );

            // ไปหน้า Login
            window.location.href = '/login.html';


        } catch (error) {

            // ====================================================
            // ERROR HANDLING
            // ====================================================

            console.error(
                'Registration Error:',
                error
            );

            // แสดง Error
            alert(
                error.message ||
                'เกิดข้อผิดพลาดในการสมัครสมาชิก'
            );

            // แสดง Error ในหน้าเว็บ
            if (message) {
                message.textContent = error.message;
            }


        } finally {

            // ====================================================
            // ENABLE BUTTON
            // ====================================================

            // เปิดปุ่มกลับมา
            button.disabled = false;
        }
    });
});