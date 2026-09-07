const express = require('express');
const path = require('path');
const { Pool } = require('pg');

// 1. โหลด dotenv เฉพาะเมื่อรันบนเครื่อง Local (ไม่ใช่ Production)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// 2. เชื่อมต่อ Database (Neon PostgreSQL)
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err.stack);
    } else {
        console.log('Connected to Neon PostgreSQL successfully');
    }
});

// 3. ตั้งค่า Static Path ชี้ไปที่โฟลเดอร์ frontend
const staticPath = path.join(__dirname, '../frontend');
app.use(express.static(staticPath));

// --- API ROUTES (วางไว้ก่อน Frontend Routes เสมอ) ---

// ดึงข้อมูล User ตาม ID
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
        console.error("Fetch user by ID error:", err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// --- FRONTEND ROUTES (วางไว้ล่างสุดเสมอ) ---

// หน้าแรก
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Catch-all Route สำหรับรองรับ SPA
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});