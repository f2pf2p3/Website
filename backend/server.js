const path = require('path');

// โหลด .env สำหรับ Local Development ( Render จะดึง process.env มาใช้อัตโนมัติอยู่แล้ว)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // เปลี่ยนจาก mysql2 เป็น pg
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- SETTING NEON POSTGRESQL CONNECTION (POOL) ---
// ใช้ DATABASE_URL จาก Neon ที่กำหนดไว้ใน .env หรือ Render Environment Variables
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // จำเป็นสำหรับการเชื่อมต่อ Neon SSL
    }
});

// ทดสอบการเชื่อมต่อฐานข้อมูล
db.connect()
    .then(() => console.log(' Connected to Neon PostgreSQL'))
    .catch(err => console.error(' Database connection error:', err));

// --- API: GET USER BY ID ---
app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const sql = `
            SELECT id, username, email
            FROM users
            WHERE id = $1
            LIMIT 1
        `;

        const result = await db.query(sql, [userId]);

        // User does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // User exists
        res.json({
            status: 'success',
            user: result.rows[0]
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
            WHERE username = $1 OR email = $2
            LIMIT 1
        `;

        const result = await db.query(sql, [username, username]);

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid username/email or password"
            });
        }

        const user = result.rows[0];

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
        const sql = 'SELECT id, username, email, created_at FROM users ORDER BY id DESC';
        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch users error:", err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// --- API: DELETE USER ---
app.delete('/api/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const sql = 'DELETE FROM users WHERE id = $1';
        const result = await db.query(sql, [userId]);

        if (result.rowCount === 0) {
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

        // PostgreSQL ใช้ RETURNING id เพื่อคืนค่า Primary Key ที่สร้างขึ้นใหม่
        const sql = `
            INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3)
            RETURNING id
        `;

        const result = await db.query(sql, [username, email, hashedPassword]);

        res.status(201).json({
            status: "success",
            message: "สมัครสมาชิกสำเร็จแล้ว!",
            userId: result.rows[0].id // ดึง ID ผ่าน result.rows[0].id แทน insertId
        });

    } catch (error) {
        console.error("Register error:", error);

        // PostgreSQL Error code สำหรับข้อมูลซ้ำ (Unique constraint violation) คือ '23505'
        if (error.code === '23505') {
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