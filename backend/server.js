// ============================================================
// IMPORTS
// ============================================================

// Express creates the web server and API.
const express = require('express');

// Path handles file and folder paths.
const path = require('path');

// CORS allows cross-origin requests during local development.
const cors = require('cors');

// PostgreSQL Pool connects to Neon PostgreSQL.
const { Pool } = require('pg');


// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

// Load .env when running locally.
//
// Render does not need this because Render provides
// environment variables directly.
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
//
// When running locally, port 5000 will be used.
const PORT = process.env.PORT || 5000;


// ============================================================
// MIDDLEWARE
// ============================================================

// Enable CORS.
app.use(cors());


// Allow Express to read JSON request bodies.
app.use(express.json());


// ============================================================
// SERVE FRONTEND
// ============================================================

// Tell Express to serve files from:
//
// Website/frontend/
//
// This makes these files available:
//
// /index.html
// /login.html
// /register.html
// /style.css
// /frontend.js
app.use(
    express.static(
        path.join(__dirname, '../frontend')
    )
);


// ============================================================
// DATABASE
// ============================================================

// Create PostgreSQL connection pool.
const db = new Pool({

    // Read Neon PostgreSQL connection string.
    connectionString:
        process.env.DATABASE_URL,

    // Neon requires SSL.
    ssl: {
        rejectUnauthorized: false
    }
});


// ============================================================
// DATABASE CONNECTION TEST
// ============================================================

// Test database connection when server starts.
db.connect(
    (error, client, release) => {

        // Database connection failed.
        if (error) {

            console.error(
                'Database connection error:',
                error.stack
            );

            return;
        }


        // Database connection succeeded.
        console.log(
            'Connected to Neon PostgreSQL successfully'
        );


        // Return connection to the pool.
        release();
    }
);


// ============================================================
// HEALTH CHECK
// ============================================================

// Test whether the backend is running.
app.get(
    '/api/health',
    (req, res) => {

        // Return JSON.
        res.json({
            status: 'ok',
            message: 'Backend is running'
        });
    }
);


// ============================================================
// REGISTER API
// ============================================================

// Handle user registration.
app.post(
    '/api/register',
    async (req, res) => {

        // Get data from request body.
        const {
            username,
            email,
            password
        } = req.body;


        // ====================================================
        // VALIDATE INPUT
        // ====================================================

        // Check that all fields were provided.
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

            // ==================================================
            // CHECK EXISTING USER
            // ==================================================

            // Check whether username or email already exists.
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


            // User already exists.
            if (
                checkUser.rows.length > 0
            ) {

                return res.status(400).json({
                    message:
                        'Username หรือ Email นี้มีผู้ใช้งานแล้ว'
                });
            }


            // ==================================================
            // INSERT USER
            // ==================================================

            // Insert new user into PostgreSQL.
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


            // ==================================================
            // SUCCESS
            // ==================================================

            // Send JSON response to frontend.
            return res.status(201).json({

                message:
                    'สมัครสมาชิกสำเร็จ!',

                user:
                    result.rows[0]
            });

        } catch (error) {

            // Print database error.
            console.error(
                'Register Error:',
                error
            );


            // Send JSON error.
            return res.status(500).json({
                message:
                    'Database Error'
            });
        }
    }
);


// ============================================================
// LOGIN API
// ============================================================

// Handle user login.
app.post(
    '/api/login',
    async (req, res) => {

        // Get login information.
        const {
            username,
            password
        } = req.body;


        // ====================================================
        // VALIDATE INPUT
        // ====================================================

        // Make sure both fields exist.
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

            // ==================================================
            // FIND USER
            // ==================================================

            // Search using username OR email.
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


            // User does not exist.
            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({
                    message:
                        'Username/Email หรือ Password ไม่ถูกต้อง'
                });
            }


            // Get user from query result.
            const user =
                result.rows[0];


            // ==================================================
            // CHECK PASSWORD
            // ==================================================

            // Compare password.
            if (
                user.password !== password
            ) {

                return res.status(401).json({
                    message:
                        'Username/Email หรือ Password ไม่ถูกต้อง'
                });
            }


            // ==================================================
            // LOGIN SUCCESS
            // ==================================================

            // Return user information.
            return res.json({

                message:
                    'เข้าสู่ระบบสำเร็จ',

                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });

        } catch (error) {

            // Print error.
            console.error(
                'Login Error:',
                error
            );


            // Return JSON error.
            return res.status(500).json({
                message:
                    'Database Error'
            });
        }
    }
);


// ============================================================
// GET USER API
// ============================================================

// Get user information by ID.
app.get(
    '/api/users/:id',
    async (req, res) => {

        // Get user ID from URL.
        const userId =
            req.params.id;


        try {

            // ==================================================
            // FIND USER
            // ==================================================

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


            // User does not exist.
            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        'User not found'
                });
            }


            // ==================================================
            // RETURN USER
            // ==================================================

            return res.json({
                user:
                    result.rows[0]
            });

        } catch (error) {

            // Print error.
            console.error(
                'Fetch user error:',
                error
            );


            // Return JSON error.
            return res.status(500).json({
                message:
                    'Database error'
            });
        }
    }
);


// ============================================================
// HOME PAGE
// ============================================================

// Serve frontend/index.html.
app.get(
    '/',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                '../frontend/index.html'
            )
        );
    }
);


// ============================================================
// FRONTEND FALLBACK
// ============================================================

// Handle frontend GET requests that were not matched above.
//
// IMPORTANT:
// This must come AFTER all /api routes.
//
// It only handles GET requests, so it will not intercept
// POST /api/register or POST /api/login.
app.get(
    /^(?!\/api\/).*/,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                '../frontend/index.html'
            )
        );
    }
);


// ============================================================
// START SERVER
// ============================================================

// Start the Express server.
app.listen(
    PORT,
    () => {

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
    }
);