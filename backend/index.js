const path = require('path');
const express = require('express');
const cors = require('cors');// Frontend communicate Backend no problem
const mysql = require('mysql2');
const bcrypt = require('bcrypt'); // Encrypt Tool

const app = express();
const PORT = process.env.DB_PORT; // Backend use 5000 frontend use 3000

// --- .env path ---
require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
});

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

app.get('/', (req, res) => {
    res.send('Backend is running');
});

app.listen(PORT, () => {
    console.log('Backend server running at: http://localhost:' + PORT);
});