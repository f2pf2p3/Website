const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// เสิร์ฟไฟล์ Static ทั้งหมดในโฟลเดอร์ frontend (CSS, JS, Images)
app.use(express.static(__dirname));

// หน้าหลัก
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all Route สำหรับ SPA และส่งไฟล์ index.html (ใช้ Regex ป้องกัน pathToRegexpError)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Frontend Web Server running on port: ${PORT}`);
});