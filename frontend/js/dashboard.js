const API_URL = 'http://localhost:5000';


// Get saved user
const savedUser = localStorage.getItem('user');


// No user saved
if (!savedUser) {

    window.location.href = 'login.html';

} else {

    const user = JSON.parse(savedUser);

    verifyUser(user.id);
}


// ========================================
// Verify User With Database
// ========================================

async function verifyUser(userId) {

    try {

        const response = await fetch(
            `${API_URL}/api/users/${userId}`
        );

        const data = await response.json();


        // User does not exist
        if (!response.ok) {

            localStorage.removeItem('user');

            alert('Your account no longer exists.');

            window.location.href = 'login.html';

            return;
        }


        // ========================================
        // User is valid
        // ========================================

        const user = data.user;


        // Update localStorage with fresh database data
        localStorage.setItem(
            'user',
            JSON.stringify(user)
        );


        // Display username
        document.getElementById('displayName').textContent =
            user.username;


        // Display welcome message
        document.getElementById('username').textContent =
            user.username;


        // Display account information
        document.getElementById('userUsername').textContent =
            user.username;

        document.getElementById('userEmail').textContent =
            user.email;

        document.getElementById('userId').textContent =
            user.id;


    } catch (error) {

        console.error('User verification error:', error);

        alert('Cannot connect to server.');

    }
}


// ========================================
// Logout
// ========================================

function logout() {

    localStorage.removeItem('user');

    window.location.href = 'login.html';
}


// Top Logout
document.getElementById('logoutBtn')
    .addEventListener('click', logout);


// Quick Actions Logout
document.getElementById('logoutBtn2')
    .addEventListener('click', logout);