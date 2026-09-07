// ============================================================
// IMPORTS
// ============================================================

// Express สำหรับสร้าง Web Server และ API
const express = require('express');

// Path สำหรับจัดการตำแหน่งไฟล์
const path = require('path');

// CORS สำหรับอนุญาต Cross-Origin Request
const cors = require('cors');

// PostgreSQL Pool สำหรับเชื่อมต่อ Neon Database
const { Pool } = require('pg');


// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

// โหลด .env เฉพาะตอนรันบนเครื่อง Local
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({
        path: path.join(__dirname, '../.env')
    });
}


// ============================================================
// CREATE EXPRESS APP
// ============================================================

// สร้าง Express Application
const app = express();


// ============================================================
// PORT
// ============================================================

// ใช้ PORT จาก Render หรือใช้ 5000 ตอนรัน Local
const PORT = process.env.PORT || 5000;


// ============================================================
// MIDDLEWARE
// ============================================================

// เปิดใช้งาน CORS
app.use(cors());

// ให้ Express อ่าน JSON จาก Request Body
app.use(express.json());


// ============================================================
// STATIC FILES
// ============================================================

// Serve ไฟล์ทั้งหมดใน backend folder
// เช่น:
// /index.html
// /script.js
// /style.css
// /images/...
app.use(express.static(__dirname));


// ============================================================
// DATABASE CONNECTION
// ============================================================

// สร้าง PostgreSQL Connection Pool
const db = new Pool({
    // อ่าน Database URL จาก Environment Variable
    connectionString: process.env.DATABASE_URL,

    // Neon PostgreSQL ต้องใช้ SSL
    ssl: {
        rejectUnauthorized: false
    }
});


// ============================================================
// TEST DATABASE CONNECTION
// ============================================================

// ทดสอบการเชื่อมต่อ Database ตอนเปิด Server
db.connect((err, client, release) => {

    // ถ้าเชื่อมต่อไม่ได้
    if (err) {
        console.error(
            'Database connection error:',
            err.stack
        );

        return;
    }

    // แสดงข้อความเมื่อเชื่อมต่อสำเร็จ
    console.log(
        'Connected to Neon PostgreSQL successfully'
    );

    // คืน Connection กลับ Pool
    release();
});


// ============================================================
// REGISTER API
// ============================================================

// API สำหรับสมัครสมาชิก
app.post('/api/register', async (req, res) => {

    // รับข้อมูลจาก Frontend
    const { username, email, password } = req.body;

    // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
    if (!username || !email || !password) {

        return res.status(400).json({
            message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
        });
    }

    try {

        // ตรวจสอบ Username หรือ Email ซ้ำ
        const checkUser = await db.query(
            `
            SELECT id
            FROM users
            WHERE username = $1 OR email = $2
            `,
            [username, email]
        );

        // ถ้าพบ User ซ้ำ
        if (checkUser.rows.length > 0) {

            return res.status(400).json({
                message: 'Username หรือ Email นี้มีผู้ใช้งานแล้ว'
            });
        }

        // SQL สำหรับเพิ่ม User ใหม่
        const insertQuery = `
            INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, username, email
        `;

        // เพิ่มข้อมูล User ลง Database
        const result = await db.query(
            insertQuery,
            [username, email, password]
        );

        // ส่งผลลัพธ์กลับไป Browser
        return res.status(201).json({
            message: 'สมัครสมาชิกสำเร็จ!',
            user: result.rows[0]
        });

    } catch (err) {

        // แสดง Error ใน Terminal
        console.error(
            'Register Error:',
            err
        );

        // ส่ง Error กลับ Browser
        return res.status(500).json({
            message: 'Database Error'
        });
    }
});


// ============================================================
// LOGIN API
// ============================================================

// API สำหรับ Login
app.post('/api/login', async (req, res) => {

    // รับ Username หรือ Email และ Password
    const { username, password } = req.body;

    // ตรวจสอบข้อมูล
    if (!username || !password) {

        return res.status(400).json({
            message: 'กรุณากรอก Username และ Password'
        });
    }

    try {

        // ค้นหา User จาก Username หรือ Email
        const sql = `
            SELECT id, username, email, password
            FROM users
            WHERE username = $1 OR email = $1
        `;

        // Query Database
        const result = await db.query(
            sql,
            [username]
        );

        // ถ้าไม่พบ User
        if (result.rows.length === 0) {

            return res.status(401).json({
                message:
                    'Username/Email หรือ Password ไม่ถูกต้อง'
            });
        }

        // เก็บข้อมูล User
        const user = result.rows[0];

        // ตรวจสอบ Password
        if (user.password !== password) {

            return res.status(401).json({
                message:
                    'Username/Email หรือ Password ไม่ถูกต้อง'
            });
        }

        // ส่งผลลัพธ์ Login สำเร็จ
        return res.json({
            message: 'เข้าสู่ระบบสำเร็จ',

            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {

        // แสดง Error ใน Terminal
        console.error(
            'Login Error:',
            err
        );

        // ส่ง Error กลับ Browser
        return res.status(500).json({
            message: 'Database Error'
        });
    }
});


// ============================================================
// GET USER BY ID
// ============================================================

// API สำหรับดึงข้อมูล User
app.get('/api/users/:id', async (req, res) => {

    // รับ User ID จาก URL
    const userId = req.params.id;

    try {

        // SQL สำหรับค้นหา User
        const sql = `
            SELECT id, username, email, created_at
            FROM users
            WHERE id = $1
        `;

        // Query Database
        const result = await db.query(
            sql,
            [userId]
        );

        // ถ้าไม่พบ User
        if (result.rows.length === 0) {

            return res.status(404).json({
                message: 'User not found'
            });
        }

        // ส่งข้อมูล User กลับ
        return res.json({
            user: result.rows[0]
        });

    } catch (err) {

        // แสดง Error
        console.error(
            'Fetch user error:',
            err
        );

        // ส่ง Error กลับ
        return res.status(500).json({
            message: 'Database error'
        });
    }
});


// ============================================================
// HEALTH CHECK
// ============================================================

// API สำหรับตรวจสอบว่า Server ทำงานอยู่
app.get('/api/health', (req, res) => {

    // ส่งสถานะกลับ
    return res.json({
        status: 'ok',
        message: 'Backend is running'
    });
});


// ============================================================
// HOME PAGE
// ============================================================

// Route หน้าแรก
app.get('/', (req, res) => {

    // ส่ง index.html กลับไป Browser
    res.sendFile(
        path.join(__dirname, 'index.html')
    );
});


// ============================================================
// START SERVER
// ============================================================

// เริ่มต้น Server
app.listen(PORT, () => {

    // แสดง URL ของ Server
    console.log(
        `Server running on port ${PORT}`
    );
});