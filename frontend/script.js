// --- Connect Server ---

// --- Password Checking
const username = document.getElementById("username");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const form = document.getElementsByClassName("input-box");
const button = document.getElementById("registerBtn")

// Length matters most: Aim for a minimum of 12 to 15 characters, though 16 or more is much safer.
// Use passphrases: Combine 5 to 7 random words or a memorable sentence to make long strings easier to remember.
// Stay unique: Never reuse the same password across multiple websites or apps.
// Skip forced complexity: Modern guidelines from the (NIST) suggest that forcing symbols or numbers is optional, because length beats short and complex strings.
// Avoid personal details: Do not use your name, birthdate, pet names, or common dictionary words


if (button) {
    button.addEventListener("click", function (e) {
        console.log("clicked");
        if (password.value !== confirmPassword.value) {
            e.preventDefault();
            console.error("Password missmatch!")

        } else {

            // --- Account registration ---

            const userData = {
                username: username.value,
                email: email.value,
                password: password.value
            };

            fetch('website-backend-70pc.onrender.com/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            })
                .then(response => response.json())
                .then(data => {
                    console.log('ผลลัพธ์จากเซิร์ฟเวอร์:', data);
                    alert(data.message);
                })
                .catch(error => console.error('Error:', error));


        }

    });
}
