const path = require('path');
// --- .env path ---
require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
});

const express = require('express');
const cors = require('cors');// Frontend communicate Backend no problem
const mysql = require('mysql2');
const bcrypt = require('bcrypt'); // Encrypt Tool

const app = express();
const PORT = process.env.PORT || 5000; // Backend use 5000 frontend use 3000


// --- MIDDLEWARE ---
app.use(cors()); //allow every domain access API
app.use(express.json()) // allow server read JSON when Frontend communicate

// --- SETTING MySQL CONNECTION ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // XAMPP ''
    database: process.env.DB_NAME// database schema name
});

// --- API: LOGIN ---
app.post('/api/login', (req, res) => {

    const { username, password } = req.body;

    console.log("Login attempt:", {
        username,
        password: password ? "received" : "missing"
    });

    // Check information
    if (!username || !password) {
        return res.status(400).json({
            message: "Please enter username/email and password"
        });
    }

    const sql = `
        SELECT id, username, email, password
        FROM users
        WHERE username = ? OR email = ?
        LIMIT 1
    `;

    db.query(sql, [username, username], async (err, results) => {

        if (err) {
            console.error("Login database error:", err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        // User doesn't exist
        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid username/email or password"
            });
        }

        const user = results[0];

        try {

            // Compare entered password with hashed password
            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    message: "Invalid username/email or password"
                });
            }

            // Login successful
            res.json({
                status: "success",
                message: "Login successful!",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });

        } catch (error) {

            console.error("Password comparison error:", error);

            return res.status(500).json({
                message: "Server error"
            });
        }
    });
});

// --- load all user ---
app.get('/api/users', (req, res) => {
    const sql = 'SELECT id, username, email, created_at FROM users';

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        res.json(results);
    });
});

// --- delete user ---
app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;

    const sql = 'DELETE FROM users WHERE id = ?';

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error('Delete error:', err);
            return res.status(500).json({ message: 'Failed to delete user' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    });
});

// --- API: REGISTER ---
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    console.log("Register data:", {
            username,
            email,
            password: password ? "received" : "missing"
        });

    // Check information 
    if (!username || !email || !password) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" })
    }

    try {
        // 2. เข้ารหัสรหัสผ่าน (Hashing Password) เพื่อความปลอดภัย
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
        INSERT INTO users (username, email, password)
        VALUES (?, ?, ?)
    `;

        db.query(sql,
            [username, email, hashedPassword],
            (err, result) => {
                if (err) {
                    // หากจับได้ว่า username หรือ email ซ้ำ (เพราะเราตั้ง UNIQUE ไว้)
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ message: "Username หรือ Email นี้ถูกใช้งานแล้ว" });
                    }
                    return res.status(500).json({ error: err.message });
                }

                // 4. ส่งสถานะตอบกลับเมื่อบันทึกสำเร็จ
                res.status(201).json({
                    status: "success",
                    message: "สมัครสมาชิกสำเร็จแล้ว!",
                    userId: result.insertId
                });

            });

    } catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }

});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Backend server running at: http://localhost:${PORT}`);
});