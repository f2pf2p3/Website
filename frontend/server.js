// ============================================================
// API CONFIGURATION
// ============================================================

// Frontend and backend are served by the same Render Web Service.
// Therefore, we use relative API URLs.
const API_URL = '';


// ============================================================
// HELPER: READ SERVER RESPONSE
// ============================================================

// Read a response from the backend.
//
// We read text first so that an HTML error page such as
// "Cannot POST /api/register" can be detected clearly.
async function readResponse(response) {

    // Read the complete response body as text.
    const responseText = await response.text();

    // Show useful debugging information in the browser console.
    console.log('HTTP Status:', response.status);
    console.log('Response:', responseText);


    // Try to convert the response to JSON.
    let data;

    try {

        data = JSON.parse(responseText);

    } catch (error) {

        // The backend returned something that isn't JSON.
        console.error(
            'Server returned non-JSON response:',
            responseText
        );

        throw new Error(
            `Server returned ${response.status} instead of JSON`
        );
    }


    // Return both the HTTP response and parsed JSON.
    return {
        response,
        data
    };
}


// ============================================================
// REGISTER USER
// ============================================================

// Send a registration request to the backend.
async function registerUser(
    username,
    email,
    password
) {

    // Send POST request to /api/register.
    const response = await fetch(
        `${API_URL}/api/register`,
        {
            // HTTP method.
            method: 'POST',

            // Tell Express that the request body is JSON.
            headers: {
                'Content-Type': 'application/json'
            },

            // Convert JavaScript object into JSON.
            body: JSON.stringify({
                username: username.trim(),
                email: email.trim(),
                password: password
            })
        }
    );


    // Read and parse the backend response.
    const {
        data
    } = await readResponse(response);


    // Check whether the HTTP request succeeded.
    if (!response.ok) {

        throw new Error(
            data.message ||
            'Registration failed'
        );
    }


    // Return successful registration data.
    return data;
}


// ============================================================
// LOGIN USER
// ============================================================

// Send a login request to the backend.
async function loginUser(
    username,
    password
) {

    // Send POST request to /api/login.
    const response = await fetch(
        `${API_URL}/api/login`,
        {
            // HTTP method.
            method: 'POST',

            // Request contains JSON.
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


    // Read and parse backend response.
    const {
        data
    } = await readResponse(response);


    // Check HTTP status.
    if (!response.ok) {

        throw new Error(
            data.message ||
            'Login failed'
        );
    }


    // Return successful login data.
    return data;
}


// ============================================================
// CHECK BACKEND
// ============================================================

// Check whether the backend is running.
async function checkBackend() {

    // Request the backend health endpoint.
    const response = await fetch(
        `${API_URL}/api/health`
    );


    // Read the response.
    const {
        data
    } = await readResponse(response);


    // Return health information.
    return data;
}


// ============================================================
// REGISTER PAGE
// ============================================================

// Wait until the HTML document has loaded.
document.addEventListener(
    'DOMContentLoaded',
    () => {

        // Find the Register button.
        const registerButton =
            document.getElementById('registerBtn');


        // If there is no Register button,
        // this is probably not the registration page.
        if (!registerButton) {
            return;
        }


        // ====================================================
        // GET INPUT ELEMENTS
        // ====================================================

        // Username input.
        const username =
            document.getElementById('username');

        // Email input.
        const email =
            document.getElementById('email');

        // Password input.
        const password =
            document.getElementById('password');

        // Confirm password input.
        const confirmPassword =
            document.getElementById('confirmPassword');

        // Message element.
        const message =
            document.getElementById('message');


        // ====================================================
        // REGISTER BUTTON
        // ====================================================

        // Listen for Register button click.
        registerButton.addEventListener(
            'click',
            async (event) => {

                // Prevent normal HTML form submission.
                event.preventDefault();


                // ==================================================
                // VALIDATE ELEMENTS
                // ==================================================

                // Make sure all required HTML elements exist.
                if (
                    !username ||
                    !email ||
                    !password ||
                    !confirmPassword
                ) {

                    console.error(
                        'Registration form element is missing.'
                    );

                    return;
                }


                // ==================================================
                // VALIDATE INPUT
                // ==================================================

                // Check that every field has a value.
                if (
                    !username.value.trim() ||
                    !email.value.trim() ||
                    !password.value ||
                    !confirmPassword.value
                ) {

                    alert(
                        'กรุณากรอกข้อมูลให้ครบทุกช่อง'
                    );

                    return;
                }


                // ==================================================
                // VALIDATE PASSWORD LENGTH
                // ==================================================

                // Password must contain at least 8 characters.
                if (password.value.length < 8) {

                    alert(
                        'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
                    );

                    return;
                }


                // ==================================================
                // VALIDATE PASSWORD MATCH
                // ==================================================

                // Make sure both password fields match.
                if (
                    password.value !==
                    confirmPassword.value
                ) {

                    alert(
                        'รหัสผ่านยืนยันไม่ตรงกัน'
                    );

                    return;
                }


                // ==================================================
                // DISABLE BUTTON
                // ==================================================

                // Prevent duplicate registration requests.
                registerButton.disabled = true;


                // ==================================================
                // CLEAR OLD MESSAGE
                // ==================================================

                // Remove any previous error message.
                if (message) {
                    message.textContent = '';
                }


                try {

                    // ==================================================
                    // SEND REGISTRATION REQUEST
                    // ==================================================

                    const data =
                        await registerUser(
                            username.value,
                            email.value,
                            password.value
                        );


                    // ==================================================
                    // SUCCESS
                    // ==================================================

                    // Show success message.
                    alert(
                        data.message ||
                        'สมัครสมาชิกสำเร็จ!'
                    );


                    // Go to Login page.
                    window.location.href =
                        '/login.html';

                } catch (error) {

                    // ==================================================
                    // ERROR
                    // ==================================================

                    // Print error in browser console.
                    console.error(
                        'Registration Error:',
                        error
                    );


                    // Show error to user.
                    alert(
                        error.message ||
                        'เกิดข้อผิดพลาดในการสมัครสมาชิก'
                    );


                    // Show error on the page if the element exists.
                    if (message) {

                        message.textContent =
                            error.message;
                    }

                } finally {

                    // ==================================================
                    // ENABLE BUTTON
                    // ==================================================

                    // Allow the user to click Register again.
                    registerButton.disabled = false;
                }
            }
        );
    }
);


// ============================================================
// LOGIN PAGE
// ============================================================

// Wait until the login page has loaded.
document.addEventListener(
    'DOMContentLoaded',
    () => {

        // Find Login button.
        const loginButton =
            document.getElementById('loginBtn');


        // If there is no Login button,
        // this probably isn't the login page.
        if (!loginButton) {
            return;
        }


        // ====================================================
        // GET LOGIN ELEMENTS
        // ====================================================

        // Username or email input.
        const username =
            document.getElementById('username');

        // Password input.
        const password =
            document.getElementById('password');

        // Message element.
        const message =
            document.getElementById('message');


        // ====================================================
        // LOGIN BUTTON
        // ====================================================

        // Handle Login button click.
        loginButton.addEventListener(
            'click',
            async (event) => {

                // Prevent normal form submission.
                event.preventDefault();


                // ==================================================
                // VALIDATE INPUT
                // ==================================================

                if (
                    !username ||
                    !password
                ) {

                    console.error(
                        'Login form element is missing.'
                    );

                    return;
                }


                // Check required fields.
                if (
                    !username.value.trim() ||
                    !password.value
                ) {

                    alert(
                        'กรุณากรอก Username และ Password'
                    );

                    return;
                }


                // Disable button during login.
                loginButton.disabled = true;


                // Clear previous message.
                if (message) {
                    message.textContent = '';
                }


                try {

                    // ==================================================
                    // SEND LOGIN REQUEST
                    // ==================================================

                    const data =
                        await loginUser(
                            username.value,
                            password.value
                        );


                    // ==================================================
                    // SAVE USER INFORMATION
                    // ==================================================

                    // Save the logged-in user locally.
                    localStorage.setItem(
                        'user',
                        JSON.stringify(data.user)
                    );


                    // ==================================================
                    // LOGIN SUCCESS
                    // ==================================================

                    alert(
                        data.message ||
                        'เข้าสู่ระบบสำเร็จ'
                    );


                    // Change this to your dashboard page
                    // if you have one.
                    window.location.href =
                        '/index.html';

                } catch (error) {

                    // Print error.
                    console.error(
                        'Login Error:',
                        error
                    );


                    // Show error.
                    alert(
                        error.message ||
                        'เข้าสู่ระบบไม่สำเร็จ'
                    );


                    // Display error on page.
                    if (message) {

                        message.textContent =
                            error.message;
                    }

                } finally {

                    // Enable button again.
                    loginButton.disabled = false;
                }
            }
        );
    }
);