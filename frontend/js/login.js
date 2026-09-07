const API_URL = 'http://localhost:5000';

const form = document.getElementById('loginForm');
const message = document.getElementById('message');

if (form) {
    form.addEventListener('submit', async function (e) {

        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

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

            // Save logged-in user
            localStorage.setItem('user', JSON.stringify(data.user));

            // Go to dashboard
            window.location.href = 'dashboard.html';

            message.textContent = data.message;

        } catch (error) {

            console.error('Login error:', error);

            message.textContent = 'Invalid Username/Email or Password';
        }
    });
}