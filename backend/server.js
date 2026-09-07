const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 5000;


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

    if (!username || !email || !password) {

        return res.status(400).json({
            message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
        });

    }

    try {

        const checkUser = await db.query(
            `
            SELECT id
            FROM users
            WHERE username = $1
               OR email = $2
            `,
            [username, email]
        );

        if (checkUser.rows.length > 0) {

            return res.status(400).json({
                message: 'Username หรือ Email นี้มีผู้ใช้งานแล้ว'
            });

        }

        const result = await db.query(
            `
            INSERT INTO users
                (username, email, password)
            VALUES
                ($1, $2, $3)
            RETURNING
                id,
                username,
                email
            `,
            [username, email, password]
        );

        return res.status(201).json({
            status: 'success',
            message: 'สมัครสมาชิกสำเร็จ!',
            user: result.rows[0]
        });

    } catch (error) {

        console.error('Register Error:', error);

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
    console.log('GET  /');
    console.log('GET  /api/health');
    console.log('POST /api/register');
    console.log('========================================');

});