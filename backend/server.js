const express = require('express');
const cors = require('cors');
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
// DATABASE
// ============================================================

const db = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }
});


// Test PostgreSQL connection.
db.connect((error, client, release) => {

    if (error) {
        console.error(
            'Database connection failed:',
            error.message
        );

        return;
    }

    console.log(
        'Connected to Neon PostgreSQL successfully'
    );

    release();
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


    // Validate input.
    if (
        !username ||
        !email ||
        !password
    ) {

        return res.status(400).json({
            message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
        });
    }


    try {

        // Check whether username or email already exists.
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


        if (checkUser.rows.length > 0) {

            return res.status(400).json({
                message:
                    'Username หรือ Email นี้มีผู้ใช้งานแล้ว'
            });
        }


        // Create new user.
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


        // Return successful response.
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
// LOGIN
// ============================================================

app.post('/api/login', async (req, res) => {

    const {
        username,
        password
    } = req.body;


    // Validate input.
    if (
        !username ||
        !password
    ) {

        return res.status(400).json({
            message:
                'กรุณากรอก Username และ Password'
        });
    }


    try {

        // Find user by username OR email.
        const result = await db.query(
            `
            SELECT
                id,
                username,
                email,
                password
            FROM users
            WHERE username = $1
               OR email = $1
            `,
            [
                username
            ]
        );


        // User doesn't exist.
        if (result.rows.length === 0) {

            return res.status(401).json({
                message:
                    'Username/Email หรือ Password ไม่ถูกต้อง'
            });
        }


        const user = result.rows[0];


        // Check password.
        if (user.password !== password) {

            return res.status(401).json({
                message:
                    'Username/Email หรือ Password ไม่ถูกต้อง'
            });
        }


        // Login successful.
        return res.json({

            status: 'success',

            message:
                'เข้าสู่ระบบสำเร็จ',

            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });


    } catch (error) {

        console.error(
            'Login Error:',
            error
        );


        return res.status(500).json({
            message: 'Database Error'
        });
    }
});


// ============================================================
// GET USER
// ============================================================

app.get('/api/users/:id', async (req, res) => {

    const userId = req.params.id;


    try {

        const result = await db.query(
            `
            SELECT
                id,
                username,
                email,
                created_at
            FROM users
            WHERE id = $1
            `,
            [
                userId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                message: 'User not found'
            });
        }


        return res.json({
            user: result.rows[0]
        });


    } catch (error) {

        console.error(
            'Get User Error:',
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
    console.log('BACKEND SERVER STARTED');
    console.log(`PORT: ${PORT}`);
    console.log('POST /api/register');
    console.log('POST /api/login');
    console.log('GET /api/users/:id');
    console.log('GET /api/health');
    console.log('========================================');
});