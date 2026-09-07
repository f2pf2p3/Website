const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 5000;


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(express.json());


// ============================================================
// SERVE WEBSITE
// ============================================================

// Serve index.html, style.css, script.js
// from the backend folder.
app.use(express.static(__dirname));


// ============================================================
// MAIN PAGE
// ============================================================

// Open backend/index.html at:
//
// https://your-backend.onrender.com/
app.get('/', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'index.html')
    );

});


// ============================================================
// DATABASE
// ============================================================

const db = new Pool({

    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }

});


// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {

    res.json({
        status: 'ok',
        message: 'Backend is running'
    });

});


// ============================================================
// REGISTER
// ============================================================

app.post('/api/register', async (req, res) => {

    const {
        username,
        email,
        password
    } = req.body;


    // Check required fields.
    if (!username || !email || !password) {

        return res.status(400).json({
            message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
        });

    }


    try {

        // Check existing username or email.
        const checkUser = await db.query(
            `
            SELECT id
            FROM users
            WHERE username = $1
               OR email = $2
            `,
            [
                username,
                email
            ]
        );


        // User already exists.
        if (checkUser.rows.length > 0) {

            return res.status(400).json({
                message:
                    'Username หรือ Email นี้มีผู้ใช้งานแล้ว'
            });

        }


        // Insert new user.
        const result = await db.query(
            `
            INSERT INTO users
                (
                    username,
                    email,
                    password
                )
            VALUES
                (
                    $1,
                    $2,
                    $3
                )
            RETURNING
                id,
                username,
                email
            `,
            [
                username,
                email,
                password
            ]
        );


        // Registration successful.
        return res.status(201).json({

            status: 'success',

            message:
                'สมัครสมาชิกสำเร็จ!',

            user:
                result.rows[0]

        });


    } catch (error) {

        console.error(
            'Register Error:',
            error
        );


        return res.status(500).json({
            message: 'Database Error'
        });

    }

});
app.get('/api/users', async (req, res) => {

    try {

        const result = await db.query(`
            SELECT
                id,
                username,
                email,
                created_at
            FROM users
            ORDER BY id DESC
        `);

        res.json(result.rows);

    } catch (error) {

        console.error('Get Users Error:', error);

        res.status(500).json({
            message: 'Database Error'
        });

    }

});
app.delete('/api/users/:id', async (req, res) => {

    const userId = req.params.id;

    try {

        const result = await db.query(
            `
            DELETE FROM users
            WHERE id = $1
            RETURNING id
            `,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            message: 'User deleted successfully'
        });

    } catch (error) {

        console.error('Delete User Error:', error);

        res.status(500).json({
            message: 'Database Error'
        });

    }

});

app.post('/api/login', async (req, res) => {

    const { email, password } = req.body;

    console.log('Login request:', {
        email,
        hasPassword: !!password
    });

    if (!email || !password) {
        return res.status(400).json({
            message: 'กรุณากรอก Email และ Password'
        });
    }

    try {

        const result = await db.query(
            `
            SELECT id, username, email, password
            FROM users
            WHERE email = $1
            `,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: 'Email หรือ Password ไม่ถูกต้อง'
            });
        }

        const user = result.rows[0];

        if (password !== user.password) {
            return res.status(401).json({
                message: 'Email หรือ Password ไม่ถูกต้อง'
            });
        }

        res.json({
            status: 'success',
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {

        console.error('Login Error:', error);

        res.status(500).json({
            message: 'Database Error'
        });
    }
});
// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {

    console.log('========================================');

    console.log(
        'BACKEND SERVER STARTED'
    );

    console.log(
        `PORT: ${PORT}`
    );

    console.log(
        'GET  /'
    );

    console.log(
        'GET  /api/health'
    );

    console.log(
        'POST /api/register'
    );

    console.log('========================================');

});