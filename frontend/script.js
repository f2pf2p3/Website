
// --- Password Checking & Account Register---
const username = document.getElementById("username");
const email = documents.getElementById("email");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const message = document.getElementById("passwordMessage");
const form = document.querySelector("form");

form.addEventListener("submit", function (event) {
    if (password.value !== confirmPassword.value) {
        event.preventDefault();

        message.textContent = "Passwords do not match.";
        message.style.color = "red";
    } else {
        const userData = {
            username: username,
            email: email,
            password: password
        };

        fetch('http://localhost:5000/api/register', {
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
