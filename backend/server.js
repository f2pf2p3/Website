// ============================================================
// IMPORTS
// ============================================================

// Express creates the web server and API.
const express = require('express');

// Path handles file paths.
const path = require('path');

// CORS allows requests from other origins.
// It is useful during local development.
const cors = require('cors');

// PostgreSQL Pool connects to Neon PostgreSQL.
const { Pool } = require('pg');


// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

// Load .env when running locally.
// Render already provides environment variables directly.
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({
        path: path.join(__dirname, '../.env')
    });
}


// ============================================================
// CREATE EXPRESS APP
// ============================================================

// Create Express application.
const app = express();


// ============================================================
// PORT
// ============================================================

// Render provides process.env.PORT.
// 5000 is used when running locally.
const PORT = process.env.PORT || 5000;


// ============================================================
// MIDDLEWARE
// ============================================================

// Enable CORS.
app.use(cors());

// Allow Express to read JSON request bodies.
app.use(express.json());

// Serve frontend files from the same backend folder.
app.use(express.static(__dirname));


// ============================================================
// DATABASE
// ============================================================

// Create PostgreSQL connection pool.
const db = new Pool({
    // Get Neon connection string from environment variable.
    connectionString: process.env.DATABASE_URL,

    // Neon requires SSL.
    ssl: {
        rejectUnauthorized: false
    }
});


// ============================================================
// DATABASE CONNECTION TEST
// ============================================================

// Test the database connection when the server starts.
db.connect((err, client, release) => {

    // Database connection failed.
    if (err) {
        console.error(
            'Database connection error:',
            err.stack
        );

        return;
    }

    // Database connection succeeded.
    console.log(
        'Connected to Neon PostgreSQL successfully'
    );

    // Return the connection to the pool.
    release();
});


// ============================================================
// HEALTH CHECK
// ============================================================

// Test whether the backend is running.
app.get('/api/health', (req, res) => {

    // Return JSON response.
    res.json({
        status: 'ok',
        message: 'Backend is running'
    });
});


// ============================================================
// REGISTER API
// ============================================================

// Handle new user registration.
app.post('/api/register', async (req, res) => {

    // Get registration data from the request.
    const {
        username,
        email,
        password
    } = req.body;


    // --------------------------------------------------------
    // VALIDATE INPUT
    // --------------------------------------------------------

    // Make sure all fields were provided.
    if (!username || !email || !password) {

        return res.status(400).json({
            message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
        });
    }


    try {

        // ----------------------------------------------------
        // CHECK EXISTING USER
        // ----------------------------------------------------

        // Check whether username or email already exists.
        const checkUser = await db.query(
            `
            SELECT id
            FROM users
            WHERE username = $1
               OR email = $2
            `,
            [username, email]
        );


        // User already exists.
        if (checkUser.rows.length > 0) {

            return res.status(400).json({
                message:
                    'Username หรือ Email นี้มีผู้ใช้งานแล้ว'
            });
        }


        // ----------------------------------------------------
        // INSERT USER
        // ----------------------------------------------------

        // Insert new user into Neon PostgreSQL.
        const result = await db.query(
            `
            INSERT INTO users
                (username, email, password)
            VALUES
                ($1, $2, $3)
            RETURNING id, username, email
            `,
            [
                username,
                email,
                password
            ]
        );


        // ----------------------------------------------------
        // SUCCESS RESPONSE
        // ----------------------------------------------------

        // Return the newly created user.
        return res.status(201).json({
            message: 'สมัครสมาชิกสำเร็จ!',
            user: result.rows[0]
        });

    } catch (error) {

        // Log database error in Render logs.
        console.error(
            'Register Error:',
            error
        );

        // Return JSON error.
        return res.status(500).json({
            message: 'Database Error'
        });
    }
});


// ============================================================
// LOGIN API
// ============================================================

// Handle user login.
app.post('/api/login', async (req, res) => {

    // Get login information.
    const {
        username,
        password
    } = req.body;


    // --------------------------------------------------------
    // VALIDATE INPUT
    // --------------------------------------------------------

    if (!username || !password) {

        return res.status(400).json({
            message:
                'กรุณากรอก Username และ Password'
        });
    }


    try {

        // ----------------------------------------------------
        // FIND USER
        // ----------------------------------------------------

        // Search by username OR email.
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
            [username]
        );


        // User doesn't exist.
        if (result.rows.length === 0) {

            return res.status(401).json({
                message:
                    'Username/Email หรือ Password ไม่ถูกต้อง'
            });
        }


        // Get user from query result.
        const user = result.rows[0];


        // ----------------------------------------------------
        // CHECK PASSWORD
        // ----------------------------------------------------

        if (user.password !== password) {

            return res.status(401).json({
                message:
                    'Username/Email หรือ Password ไม่ถูกต้อง'
            });
        }


        // ----------------------------------------------------
        // LOGIN SUCCESS
        // ----------------------------------------------------

        return res.json({

            message: 'เข้าสู่ระบบสำเร็จ',

            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {

        // Log error.
        console.error(
            'Login Error:',
            error
        );

        // Return JSON error.
        return res.status(500).json({
            message: 'Database Error'
        });
    }
});


// ============================================================
// GET USER
// ============================================================

// Get user information by ID.
app.get('/api/users/:id', async (req, res) => {

    // Get ID from URL.
    const userId = req.params.id;


    try {

        // Query user.
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
            [userId]
        );


        // User not found.
        if (result.rows.length === 0) {

            return res.status(404).json({
                message: 'User not found'
            });
        }


        // Return user.
        return res.json({
            user: result.rows[0]
        });

    } catch (error) {

        // Log error.
        console.error(
            'Fetch user error:',
            error
        );

        // Return JSON error.
        return res.status(500).json({
            message: 'Database error'
        });
    }
});


// ============================================================
// FRONTEND HOME PAGE
// ============================================================

// Serve index.html.
app.get('/', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'index.html')
    );
});


// ============================================================
// SPA FALLBACK
// ============================================================

// Only handle non-API GET requests.
// API routes above will not be affected.
app.get(
    /^(?!\/api\/).*/,
    (req, res) => {

        res.sendFile(
            path.join(__dirname, 'index.html')
        );
    }
);


// ============================================================
// START SERVER
// ============================================================

// Start Express server.
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
        'REGISTER: POST /api/register'
    );

    console.log(
        'LOGIN: POST /api/login'
    );

    console.log(
        'HEALTH: GET /api/health'
    );

    console.log(
        '========================================'
    );
});