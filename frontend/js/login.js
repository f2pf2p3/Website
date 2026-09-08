const API_URL = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
)
    ? 'http://localhost:5000'
    : 'https://website-backend-70pc.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const otpInput = document.getElementById('otp');
    const otpGroup = document.getElementById('otpGroup');
    const message = document.getElementById('message');
    const submitButton = document.getElementById('loginBtn');
    let otpRequested = false;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitButton.disabled = true;
        message.textContent = otpRequested ? 'Checking your verification code...' : 'Checking your sign-in details...';
        message.className = 'message show pending';
        try {
            const endpoint = otpRequested ? '/api/login/verify-otp' : '/api/login';
            const body = otpRequested
                ? { usernameOrEmail: usernameInput.value.trim(), otp: otpInput.value.trim() }
                : { usernameOrEmail: usernameInput.value.trim(), password: passwordInput.value };
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
                        : data.message || 'Login failed'
                );
            }

            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.user.username);
                if (data.user.role === 'admin') {
                    window.location.assign(`${API_URL}/index.html?token=${encodeURIComponent(data.token)}`);
                } else {
                    window.location.assign('dashboard.html');
                }
                return;
            }

            if (!otpRequested) {
                otpRequested = true;
                form.classList.add('otp-requested');
                otpGroup.hidden = false;
                passwordInput.hidden = true;
                submitButton.textContent = 'Verify code';
                message.textContent = data.message || 'Verification code sent. Check your email.';
                message.className = 'message show success';
                submitButton.disabled = false;
                otpInput.focus();
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            if (data.user.role === 'admin') {
                window.location.assign(`${API_URL}/index.html?token=${encodeURIComponent(data.token)}`);
            } else {
                window.location.assign('dashboard.html');
            }
        } catch (error) {
            message.textContent = error.message;
            message.className = 'message show error';
            submitButton.disabled = false;
        }
    });
});
