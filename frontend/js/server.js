const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. ระบุโฟลเดอร์สำหรับ Static Files ให้ชัดเจน
// หากไฟล์ HTML/CSS อยู่โฟลเดอร์เดียวกับไฟล์นี้ ให้ใช้ path.join(__dirname, 'public') หรือ path.join(__dirname)
const staticPath = path.join(__dirname, '../'); // หรือเปลี่ยนเป็น path.join(__dirname, 'public') ตามโครงสร้างจริง
app.use(express.static(staticPath));

// 2. เสิร์ฟหน้า index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// 3. (Optional) Catch-all route สำหรับ SPA (ถ้าอนาคตใช้ React/Vue หรือมีหลายหน้า)
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// --- API: GET USER BY ID ---
app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const sql = 'SELECT id, username, email, created_at FROM users WHERE id = ?';
        const [results] = await db.execute(sql, [userId]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: results[0] });
    } catch (err) {
        console.error("Fetch user by ID error:", err);
        return res.status(500).json({ error: 'Database error' });
    }
});

app.listen(PORT, () => {
    console.log(`Frontend running on port: ${PORT}`);
});

