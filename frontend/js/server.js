const express = require('express');
const path = require('path');

// 1. โหลด dotenv เฉพาะเมื่อเทสบนเครื่อง local เพื่อไม่ให้ Render เกิด Error
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// --- DATABASE CONNECTION (NEON POSTGRES) ---
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ตรวจสอบการเชื่อมต่อ Database
db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err.stack);
    } else {
        console.log('Connected to Neon PostgreSQL');
    }
});

// --- STATIC FILES SETUP ---
// ชี้ไปยังโฟลเดอร์ frontend (ปรับตามโครงสร้างจริง เช่น '../frontend' หรือ __dirname)
const staticPath = path.join(__dirname, '../frontend'); 
app.use(express.static(staticPath));

// --- API ROUTES ---

// 1. GET USER BY ID
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


// --- FRONTEND ROUTES ---

// หน้าแรก
app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Catch-all Route สำหรับ SPA (วางล่างสุดเสมอ)
app.get('/*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});