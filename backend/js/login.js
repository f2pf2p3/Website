const form = document.getElementById('loginForm');
const message = document.getElementById('message');
const button = document.getElementById('loginBtn');
const password = document.getElementById('password');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usernameOrEmail: document.getElementById('username').value.trim(),
                password: password.value
            })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(response.status === 429
                ? 'Too many attempts. Please wait a few minutes and try again.'
                : response.status === 503
                    ? 'Email verification is temporarily unavailable. Please contact the administrator.'
                    : response.status === 422
                        ? data.message
                    : data.message || 'Login failed');
        }

        if (data.user?.role !== 'admin') throw new Error('Administrator access is required');

        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.user.username);
        window.location.assign('index.html');
    } catch (error) {
        password.value = '';
        message.textContent = error.message;
        message.className = 'message show error';
        button.disabled = false;
    }
});
