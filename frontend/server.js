// ============================================================
// API CONFIGURATION
// ============================================================

// Frontend and backend are on the same Render service.
// Therefore we can use relative URLs.
const API_URL = '';


// ============================================================
// REGISTER FUNCTION
// ============================================================

// Register a new user.
async function registerUser(
    username,
    email,
    password
) {

    try {

        // Send registration request to backend.
        const response = await fetch(
            `${API_URL}/api/register`,
            {
                // Use POST because we are creating a user.
                method: 'POST',

                // Tell backend that the body is JSON.
                headers: {
                    'Content-Type': 'application/json'
                },

                // Convert JavaScript object to JSON.
                body: JSON.stringify({
                    username: username.trim(),
                    email: email.trim(),
                    password: password
                })
            }
        );


        // Read response as text first.
        const responseText =
            await response.text();


        // Try to convert response to JSON.
        let data;

        try {

            data = JSON.parse(responseText);

        } catch (error) {

            // This means the server returned HTML
            // or another non-JSON response.
            console.error(
                'Server returned non-JSON:',
                responseText
            );

            throw new Error(
                `Server returned ${response.status} instead of JSON`
            );
        }


        // Check HTTP status.
        if (!response.ok) {

            throw new Error(
                data.message ||
                'Registration failed'
            );
        }


        // Registration succeeded.
        return data;

    } catch (error) {

        // Print error in browser console.
        console.error(
            'Registration Error:',
            error
        );

        // Pass error to the calling function.
        throw error;
    }
}


// ============================================================
// LOGIN FUNCTION
// ============================================================

// Login an existing user.
async function loginUser(
    username,
    password
) {

    try {

        // Send login request.
        const response = await fetch(
            `${API_URL}/api/login`,
            {
                // Use POST for login.
                method: 'POST',

                // Tell backend that the body is JSON.
                headers: {
                    'Content-Type': 'application/json'
                },

                // Send login information.
                body: JSON.stringify({
                    username: username.trim(),
                    password: password
                })
            }
        );


        // Read response as text.
        const responseText =
            await response.text();


        // Convert response to JSON.
        let data;

        try {

            data = JSON.parse(responseText);

        } catch (error) {

            console.error(
                'Server returned non-JSON:',
                responseText
            );

            throw new Error(
                `Server returned ${response.status} instead of JSON`
            );
        }


        // Check HTTP status.
        if (!response.ok) {

            throw new Error(
                data.message ||
                'Login failed'
            );
        }


        // Return successful login data.
        return data;

    } catch (error) {

        // Print error.
        console.error(
            'Login Error:',
            error
        );

        // Pass error to caller.
        throw error;
    }
}


// ============================================================
// REGISTER PAGE
// ============================================================

// Wait until HTML has loaded.
document.addEventListener(
    'DOMContentLoaded',
    () => {

        // Find Register button.
        const registerButton =
            document.getElementById('registerBtn');


        // If this isn't the register page,
        // there may be no register button.
        if (!registerButton) {
            return;
        }


        // Get input fields.
        const username =
            document.getElementById('username');

        const email =
            document.getElementById('email');

        const password =
            document.getElementById('password');

        const confirmPassword =
            document.getElementById(
                'confirmPassword'
            );

        const message =
            document.getElementById('message');


        // Handle Register button click.
        registerButton.addEventListener(
            'click',
            async (event) => {

                // Prevent normal form submission.
                event.preventDefault();


                // Check all fields.
                if (
                    !username.value ||
                    !email.value ||
                    !password.value ||
                    !confirmPassword.value
                ) {

                    alert(
                        'กรุณากรอกข้อมูลให้ครบทุกช่อง'
                    );

                    return;
                }


                // Check password length.
                if (password.value.length < 8) {

                    alert(
                        'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
                    );

                    return;
                }


                // Check password confirmation.
                if (
                    password.value !==
                    confirmPassword.value
                ) {

                    alert(
                        'รหัสผ่านยืนยันไม่ตรงกัน'
                    );

                    return;
                }


                // Prevent duplicate clicks.
                registerButton.disabled = true;


                try {

                    // Call backend registration function.
                    const data =
                        await registerUser(
                            username.value,
                            email.value,
                            password.value
                        );


                    // Show success message.
                    alert(
                        data.message ||
                        'สมัครสมาชิกสำเร็จ!'
                    );


                    // Go to login page.
                    window.location.href =
                        '/login.html';

                } catch (error) {

                    // Show error.
                    alert(
                        error.message ||
                        'เกิดข้อผิดพลาดในการสมัครสมาชิก'
                    );


                    // Display error on page.
                    if (message) {

                        message.textContent =
                            error.message;
                    }

                } finally {

                    // Enable button again.
                    registerButton.disabled =
                        false;
                }
            }
        );
    }
);