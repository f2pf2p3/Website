const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

// โหลด dotenv เฉพาะเมื่อรันบนเครื่อง Local
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Permissive CORS รองรับการแยก Server และ อ่าน JSON Body
app.use(cors());
app.use(express.json());

// เชื่อมต่อ Database (Neon PostgreSQL)
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) console.error('Database connection error:', err.stack);
    else console.log('Connected to Neon PostgreSQL successfully');
});

// --- API ROUTES ---

// 1. REGISTER API
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        const checkUser = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2', 
            [username, email]
        );

        if (checkUser.rows.length > 0) {
            return res.status(400).json({ message: 'Username หรือ Email นี้มีผู้ใช้งานแล้ว' });
        }

        const insertQuery = `
            INSERT INTO users (username, email, password) 
            VALUES ($1, $2, $3) 
            RETURNING id, username, email
        `;
        const newUser = await db.query(insertQuery, [username, email, password]);

        res.status(201).json({ 
            message: 'สมัครสมาชิกสำเร็จ!', 
            user: newUser.rows[0] 
        });

    } catch (err) {
        console.error("Register Error:", err);
        return res.status(500).json({ message: 'Database Error' });
    }
});

// 2. LOGIN API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'กรุณากรอก Username และ Password' });
    }

    try {
        const sql = 'SELECT id, username, email, password FROM users WHERE username = $1 OR email = $1';
        const result = await db.query(sql, [username]);

        if (result.rows.length === 0 || result.rows[0].password !== password) {
            return res.status(401).json({ message: 'Username/Email หรือ Password ไม่ถูกต้อง' });
        }

        const user = result.rows[0];

        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ message: 'Database Error' });
    }
});

// 3. GET USER BY ID
app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const sql = 'SELECT id, username, email, created_at FROM users WHERE id = $1';
        const result = await db.query(sql, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error("Fetch user error:", err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// --- FRONTEND ROUTES ---

// เสิร์ฟ index.html ฝั่ง Backend สำหรับเช็คสถานะ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all Route ฝั่ง Backend
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Backend API Server running on port: ${PORT}`);
});