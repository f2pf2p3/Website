const path = require('path');

// โหลด .env สำหรับ Local Development ( Render จะดึง process.env มาใช้อัตโนมัติอยู่แล้ว)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // เปลี่ยนเป็น mysql2/promise เพื่อรองรับ async/await
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- SETTING MySQL CONNECTION (POOL) ---
// ใช้ createPool เพื่อป้องกันปัญหาสายหลุด (Connection Timeout) บน Production
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // เปิดใช้งาน SSL หากฐานข้อมูลบน Production บังคับใช้ (เช่น Aiven, PlanetScale, Supabase)
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// --- API: GET USER BY ID (วางใน server.js) ---
app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const sql = `
            SELECT id, username, email
            FROM users
            WHERE id = ?
            LIMIT 1
        `;

        const [results] = await db.execute(sql, [userId]);

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

    } catch (err) {
        console.error('Verify user error:', err);
        return res.status(500).json({
            message: 'Database error'
        });
    }
});

// --- API: LOGIN ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    console.log("Login attempt:", {
        username,
        password: password ? "received" : "missing"
    });

    if (!username || !password) {
        return res.status(400).json({
            message: "Please enter username/email and password"
        });
    }

    try {
        const sql = `
            SELECT id, username, email, password
            FROM users
            WHERE username = ? OR email = ?
            LIMIT 1
        `;

        const [results] = await db.execute(sql, [username, username]);

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid username/email or password"
            });
        }

        const user = results[0];

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid username/email or password"
            });
        }

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
        console.error("Login server error:", error);
        return res.status(500).json({ message: "Database/Server error" });
    }
});

// --- API: LOAD ALL USERS ---
app.get('/api/users', async (req, res) => {
    try {
        const sql = 'SELECT id, username, email, created_at FROM users';
        const [results] = await db.execute(sql);
        res.json(results);
    } catch (err) {
        console.error("Fetch users error:", err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// --- API: DELETE USER ---
app.delete('/api/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const sql = 'DELETE FROM users WHERE id = ?';
        const [result] = await db.execute(sql, [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        return res.status(500).json({ message: 'Failed to delete user' });
    }
});

// --- API: REGISTER ---
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    console.log("Register data:", {
        username,
        email,
        password: password ? "received" : "missing"
    });

    if (!username || !email || !password) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (username, email, password)
            VALUES (?, ?, ?)
        `;

        const [result] = await db.execute(sql, [username, email, hashedPassword]);

        res.status(201).json({
            status: "success",
            message: "สมัครสมาชิกสำเร็จแล้ว!",
            userId: result.insertId
        });

    } catch (error) {
        console.error("Register error:", error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Username หรือ Email นี้ถูกใช้งานแล้ว" });
        }

        return res.status(500).json({ message: "Server error", error: error.message });
    }
});

// --- STATIC FILES & SERVE FRONTEND ---
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Backend server running on port: ${PORT}`);
});