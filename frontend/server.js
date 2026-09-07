// ============================================================
// BACKEND API URL
// ============================================================

// LOCAL:
// http://localhost:5000
//
// PRODUCTION:
// Replace this with your deployed backend URL.
//
// Example:
// https://my-backend.onrender.com
const API_URL = 'http://localhost:5000';


// ============================================================
// REGISTER
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    const registerButton =
        document.getElementById('registerBtn');

    // If this button doesn't exist,
    // we're not on the register page.
    if (registerButton) {

        registerButton.addEventListener('click', async (event) => {

            event.preventDefault();

            const username =
                document.getElementById('username');

            const email =
                document.getElementById('email');

            const password =
                document.getElementById('password');

            const confirmPassword =
                document.getElementById('confirmPassword');

            const message =
                document.getElementById('message');


            // Validate fields
            if (
                !username.value.trim() ||
                !email.value.trim() ||
                !password.value ||
                !confirmPassword.value
            ) {

                alert('กรุณากรอกข้อมูลให้ครบทุกช่อง');

                return;
            }


            // Validate password length
            if (password.value.length < 8) {

                alert(
                    'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
                );

                return;
            }


            // Validate password confirmation
            if (
                password.value !==
                confirmPassword.value
            ) {

                alert(
                    'รหัสผ่านยืนยันไม่ตรงกัน'
                );

                return;
            }


            registerButton.disabled = true;


            try {

                // Send data to backend
                const response = await fetch(
                    `${API_URL}/api/register`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({
                            username:
                                username.value.trim(),

                            email:
                                email.value.trim(),

                            password:
                                password.value
                        })
                    }
                );


                // Read response as text first
                const responseText =
                    await response.text();

                console.log(
                    'Register status:',
                    response.status
                );

                console.log(
                    'Register response:',
                    responseText
                );


                // Convert response to JSON
                let data;

                try {

                    data =
                        JSON.parse(responseText);

                } catch (error) {

                    throw new Error(
                        `Backend returned ${response.status}: ${responseText}`
                    );
                }


                // Backend returned an error
                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        'Registration failed'
                    );
                }


                // Registration successful
                alert(
                    data.message ||
                    'สมัครสมาชิกสำเร็จ!'
                );


                // Go to login page
                window.location.href =
                    '/login.html';

            } catch (error) {

                console.error(
                    'Registration Error:',
                    error
                );


                alert(
                    error.message ||
                    'เกิดข้อผิดพลาดในการสมัครสมาชิก'
                );


                if (message) {

                    message.textContent =
                        error.message;
                }

            } finally {

                registerButton.disabled = false;
            }
        });
    }


    // ========================================================
    // LOGIN
    // ========================================================

    const loginButton =
        document.getElementById('loginBtn');


    // If this button exists, we're on the login page.
    if (loginButton) {

        loginButton.addEventListener('click', async (event) => {

            event.preventDefault();


            const username =
                document.getElementById('username');

            const password =
                document.getElementById('password');

            const message =
                document.getElementById('message');


            // Validate fields
            if (
                !username.value.trim() ||
                !password.value
            ) {

                alert(
                    'กรุณากรอก Username และ Password'
                );

                return;
            }


            loginButton.disabled = true;


            try {

                // Send login request to backend
                const response = await fetch(
                    `${API_URL}/api/login`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({
                            username:
                                username.value.trim(),

                            password:
                                password.value
                        })
                    }
                );


                const responseText =
                    await response.text();


                console.log(
                    'Login status:',
                    response.status
                );

                console.log(
                    'Login response:',
                    responseText
                );


                let data;

                try {

                    data =
                        JSON.parse(responseText);

                } catch (error) {

                    throw new Error(
                        `Backend returned ${response.status}: ${responseText}`
                    );
                }


                // Login failed
                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        'Login failed'
                    );
                }


                // Save user information
                localStorage.setItem(
                    'user',
                    JSON.stringify(data.user)
                );


                // Login successful
                alert(
                    data.message ||
                    'เข้าสู่ระบบสำเร็จ'
                );


                // Change this to your dashboard
                // when you have one.
                window.location.href =
                    '/index.html';

            } catch (error) {

                console.error(
                    'Login Error:',
                    error
                );


                alert(
                    error.message ||
                    'เข้าสู่ระบบไม่สำเร็จ'
                );


                if (message) {

                    message.textContent =
                        error.message;
                }

            } finally {

                loginButton.disabled = false;
            }
        });
    }
});