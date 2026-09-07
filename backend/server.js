// ============================================================
// IMPORT PACKAGES
// ============================================================

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');


// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

require('dotenv').config();


// ============================================================
// CREATE EXPRESS APP
// ============================================================

const app = express();


// ============================================================
// PORT
// ============================================================

// Render provides PORT automatically.
// Local development uses 5000.
const PORT = process.env.PORT || 5000;


// ============================================================
// MIDDLEWARE
// ============================================================

// Allow requests from the separate frontend.
app.use(cors());

// Allow JSON request bodies.
app.use(express.json());


// ============================================================
// DATABASE CONNECTION
// ============================================================

const db = new Pool({

    // Neon PostgreSQL connection string
    connectionString:
        process.env.DATABASE_URL,

    // Neon requires SSL
    ssl: {
        rejectUnauthorized: false
    }
});


// ============================================================
// TEST DATABASE CONNECTION
// ============================================================

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


    // --------------------------------------------------------
    // VALIDATE INPUT
    // --------------------------------------------------------

    if (
        !username ||
        !email ||
        !password
    ) {

        return res.status(400).json({
            message:
                'กรุณากรอกข้อมูลให้ครบถ้วน'
        });
    }


    try {

        // ----------------------------------------------------
        // CHECK EXISTING USER
        // ----------------------------------------------------

        const checkUser =
            await db.query(
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


        // ----------------------------------------------------
        // CREATE USER
        // ----------------------------------------------------

        const result =
            await db.query(
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


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        return res.status(201).json({

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
            message:
                'Database Error'
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


    // --------------------------------------------------------
    // VALIDATE INPUT
    // --------------------------------------------------------

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

        // ----------------------------------------------------
        // FIND USER
        // ----------------------------------------------------

        const result =
            await db.query(
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


        // User doesn't exist
        if (result.rows.length === 0) {

            return res.status(401).json({
                message:
                    'Username/Email หรือ Password ไม่ถูกต้อง'
            });
        }


        const user =
            result.rows[0];


        // ----------------------------------------------------
        // CHECK PASSWORD
        // ----------------------------------------------------

        if (
            user.password !== password
        ) {

            return res.status(401).json({
                message:
                    'Username/Email หรือ Password ไม่ถูกต้อง'
            });
        }


        // ----------------------------------------------------
        // LOGIN SUCCESS
        // ----------------------------------------------------

        return res.json({

            message:
                'เข้าสู่ระบบสำเร็จ',

            user: {
                id:
                    user.id,

                username:
                    user.username,

                email:
                    user.email
            }
        });

    } catch (error) {

        console.error(
            'Login Error:',
            error
        );


        return res.status(500).json({
            message:
                'Database Error'
        });
    }
});


// ============================================================
// GET USER
// ============================================================

app.get('/api/users/:id', async (req, res) => {

    const userId =
        req.params.id;


    try {

        const result =
            await db.query(
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
                message:
                    'User not found'
            });
        }


        return res.json({
            user:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            'Get User Error:',
            error
        );


        return res.status(500).json({
            message:
                'Database Error'
        });
    }
});


// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {

    console.log(
        '========================================'
    );

    console.log(
        'BACKEND SERVER STARTED'
    );

    console.log(
        `PORT: ${PORT}`
    );

    console.log(
        'POST /api/register'
    );

    console.log(
        'POST /api/login'
    );

    console.log(
        'GET /api/users/:id'
    );

    console.log(
        'GET /api/health'
    );

    console.log(
        '========================================'
    );
});