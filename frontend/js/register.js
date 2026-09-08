const API_URL = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://website-backend-70pc.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const otp = document.getElementById('otp');
    const otpGroup = document.getElementById('otpGroup');
    const button = document.getElementById('registerBtn');
    const message = document.getElementById('message');
    let otpRequested = false;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        button.disabled = true;
        try {
            let endpoint;
            let body;
            if (otpRequested) {
                endpoint = '/api/register/verify-otp';
                body = { email: email.value.trim(), otp: otp.value.trim() };
            } else {
                const passwordValue = password.value;
                if (!username.value.trim() || !email.value.trim() || !passwordValue || !confirmPassword.value) {
                    throw new Error('Please complete every field.');
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
                    throw new Error('Please enter a valid email address.');
                }
                if (passwordValue.length < 8 || !/[A-Z]/.test(passwordValue)) {
                    throw new Error('Password needs at least 8 characters and 1 uppercase letter.');
                }
                if (passwordValue !== confirmPassword.value) throw new Error('Passwords do not match.');
                endpoint = '/api/register/request-otp';
                body = {
                    username: username.value.trim(),
                    email: email.value.trim(),
                    password: passwordValue
                };
            }

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    response.status === 503
                        ? 'Email verification is temporarily unavailable. Ask the administrator to authorize the server IP in Brevo.'
                        : data.message || 'Request failed'
                );
            }

            if (!otpRequested) {
                otpRequested = true;
                form.classList.add('otp-requested');
                otpGroup.hidden = false;
                password.hidden = true;
                confirmPassword.hidden = true;
                button.textContent = 'Verify code';
                message.textContent = data.message;
                message.className = 'message show success';
                button.disabled = false;
                otp.focus();
                return;
            }

            message.textContent = 'Account verified. Redirecting to login...';
            message.className = 'message show success';
            window.setTimeout(() => { window.location.href = 'login.html'; }, 500);
        } catch (error) {
            message.textContent = error.message;
            message.className = 'message show error';
            button.disabled = false;
        }
    });
});
