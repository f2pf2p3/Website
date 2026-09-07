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