// Get logged-in user
const user = JSON.parse(localStorage.getItem('user'));

const authButtons = document.querySelector('.auth-buttons');

app.get('/api/users/:id', (req, res) => {

    const userId = req.params.id;

    const sql = `
        SELECT id, username, email
        FROM users
        WHERE id = ?
        LIMIT 1
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.error('Verify user error:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        // User does not exist
        if (results.length === 0) {

            return res.status(404).json({
                message: 'User not found'
            });
        }

        // User exists
        res.json({
            status: 'success',
            user: results[0]
        });
    });
});

// ==========================
// Navigation
// ==========================

if (authButtons) {

    if (user) {

        // User is logged in
        authButtons.innerHTML = `
            <a href="dashboard.html" class="login-btn">
                ${user.username}
            </a>

            <button id="logoutBtn" class="register-btn">
                Logout
            </button>
        `;

        // Logout ONLY when Logout is clicked
        document.getElementById('logoutBtn').addEventListener('click', () => {

            localStorage.removeItem('user');

            window.location.href = 'index.html';
        });

    } else {

        // User is not logged in
        authButtons.innerHTML = `
            <a href="login.html" class="login-btn">
                Login
            </a>

            <a href="register.html" class="register-btn">
                Register
            </a>
        `;
    }
}