const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

// --- STATIC FILES SETUP ---
// ชี้ไปยังโฟลเดอร์ปัจจุบันของ backend
const staticPath = path.join(__dirname);
app.use(express.static(staticPath));

// --- API ROUTES (ต้องวางก่อน Catch-all Route '*') ---

// 1. GET USER BY ID
app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        // เปลี่ยนจาก ? เป็น $1 สำหรับ PostgreSQL
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


// --- FRONTEND ROUTES (ต้องวางไว้ล่างสุดเสมอ) ---

// หน้าแรก
app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Catch-all Route สำหรับ SPA (ต้องวางล่างสุดของ Route ทั้งหมด)
app.get('/*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});