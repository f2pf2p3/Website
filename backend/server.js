const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const otpChallenges = new Map();

if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not configured; generated a temporary secret for this process.');
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const mailer = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    })
    : null;

function makeOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

async function sendOtp(email, otp, purpose) {
    if (!mailer || !process.env.SMTP_FROM) throw new Error('SMTP is not configured');
    const result = await mailer.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: `MyWebsite ${purpose} verification code`,
        text: `Your verification code is ${otp}. It expires in 10 minutes.`
    });
    console.log('OTP email accepted by SMTP provider:', {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
    });
}

function createChallenge(key, value) {
    const current = otpChallenges.get(key);
    if (current && Date.now() - current.sentAt < OTP_RESEND_MS) {
        const error = new Error('Please wait before requesting another code');
        error.statusCode = 429;
        throw error;
    }
    const otp = makeOtp();
    otpChallenges.set(key, {
        ...value,
        codeHash: hashOtp(otp),
        expiresAt: Date.now() + OTP_TTL_MS,
        sentAt: Date.now(),
        attempts: 0
    });
    return otp;
}

function consumeChallenge(key, otp) {
    const challenge = otpChallenges.get(key);
    if (!challenge || challenge.expiresAt < Date.now() || challenge.attempts >= 5) {
        otpChallenges.delete(key);
        return null;
    }
    challenge.attempts += 1;
    if (hashOtp(otp) !== challenge.codeHash) return null;
    otpChallenges.delete(key);
    return challenge;
}

// --- AUTH MIDDLEWARE ---
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403);
        req.user = decoded;
        next();
    });
}

// ✅ NEW: admin-only gate, chained after authenticateToken
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { message: 'Too many login attempts. Please try again later.' } });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { message: 'Too many accounts created from this IP. Please try again later.' } });

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Backend is running' }));
app.get('/favicon.ico', (req, res) => res.sendStatus(204));

// REQUEST REGISTRATION OTP
app.post('/api/register/request-otp', registerLimiter, async (req, res) => {
    const { username, email, password } = req.body;
    const usernameTrimmed = username?.trim();
    const emailTrimmed = email?.trim();
    const passwordTrimmed = password?.trim();

    if (!usernameTrimmed || !emailTrimmed || !passwordTrimmed) {
        return res.status(400).json({ message: 'Please fill in all required information' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    try {
        const existing = await db.query(
            'SELECT 1 FROM users WHERE username = $1 OR email = $2',
            [usernameTrimmed, emailTrimmed]
        );
        if (existing.rowCount > 0) {
            return res.status(409).json({ message: 'Username or email already registered' });
        }

        const challengeKey = `register:${emailTrimmed.toLowerCase()}`;
        const otp = createChallenge(challengeKey, {
            type: 'register',
            username: usernameTrimmed,
            email: emailTrimmed,
            passwordHash: await bcrypt.hash(passwordTrimmed, 12)
        });
        await sendOtp(emailTrimmed, otp, 'registration');
        return res.status(202).json({ message: 'Verification code sent to your email' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        if (error.message === 'SMTP is not configured' || ['EAUTH', 'ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) {
            otpChallenges.delete(`register:${emailTrimmed.toLowerCase()}`);
            return res.status(503).json({
                message: 'Email service rejected the connection. Authorize this server IP in Brevo and create a new SMTP key.'
            });
        }
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Username or email already registered' });
        }
        console.error('Register Error:', error);
        return res.status(500).json({ message: 'Something went wrong' });
    }
});

app.post('/api/register/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !/^\d{6}$/.test(otp || '')) {
        return res.status(400).json({ message: 'Enter the six-digit verification code' });
    }
    try {
        const challenge = consumeChallenge(`register:${email.trim().toLowerCase()}`, otp);
        if (!challenge) return res.status(400).json({ message: 'Invalid or expired verification code' });
        const result = await db.query(
            `INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, role`,
            [challenge.username, challenge.email, challenge.passwordHash]
        );
        return res.status(201).json({ status: 'success', user: result.rows[0] });
    } catch (error) {
        console.error('Register verification error:', error);
        return res.status(500).json({ message: 'Could not complete registration' });
    }
});

// REQUEST LOGIN OTP
app.post('/api/login', loginLimiter, async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    let loginUserId;
    if (!usernameOrEmail || !password) {
        return res.status(400).json({ message: 'Please enter Username/email and Password' });
    }

    try {
        const result = await db.query(
            `SELECT id, username, email, password, role FROM users WHERE username = $1 OR email = $1`,
            [usernameOrEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Username or Password incorrect' });
        }

        const user = result.rows[0];
        loginUserId = user.id;
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Username or Password incorrect' });
        }

        if (user.role === 'admin') {
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );
            return res.json({
                status: 'success',
                token,
                user: { id: user.id, username: user.username, email: user.email, role: user.role }
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || '')) {
            return res.status(422).json({ message: 'This account needs a valid email address before email verification can be used.' });
        }

        const otp = createChallenge(`login:${user.id}`, {
            type: 'login',
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
        await sendOtp(user.email, otp, 'login');
        return res.status(202).json({ status: 'otp_required', message: 'Verification code sent to your email' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        if (error.message === 'SMTP is not configured' || ['EAUTH', 'ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) {
            if (loginUserId) otpChallenges.delete(`login:${loginUserId}`);
            return res.status(503).json({
                message: 'Email service rejected the connection. Authorize this server IP in Brevo and create a new SMTP key.'
            });
        }
        console.error('Login Error:', error);
        return res.status(500).json({ message: 'We could not start sign-in. Please try again.' });
    }
});

app.post('/api/login/verify-otp', async (req, res) => {
    const { usernameOrEmail, otp } = req.body;
    if (!usernameOrEmail || !/^\d{6}$/.test(otp || '')) {
        return res.status(400).json({ message: 'Enter the six-digit verification code' });
    }
    try {
        const result = await db.query(
            'SELECT id, username, email, role FROM users WHERE username = $1 OR email = $1',
            [usernameOrEmail.trim()]
        );
        if (result.rowCount === 0) return res.status(401).json({ message: 'Invalid verification request' });
        const user = result.rows[0];
        const challenge = consumeChallenge(`login:${user.id}`, otp);
        if (!challenge) return res.status(401).json({ message: 'Invalid or expired verification code' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        return res.json({
            status: 'success',
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login verification error:', error);
        return res.status(500).json({ message: 'Could not verify login code' });
    }
});

// CURRENT LOGGED-IN USER
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, email, role, created_at FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        return res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get Me Error:', error);
        return res.status(500).json({ message: 'Database Error' });
    }
});

// ✅ RESTORED, now properly locked down: admin-only user list
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, email, role, created_at FROM users ORDER BY id DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'Database Error' });
    }
});

// ✅ NEW: admin-only delete, with self-delete protection
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const targetId = parseInt(req.params.id, 10);

    if (Number.isNaN(targetId)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }

    if (targetId === req.user.id) {
        return res.status(400).json({ message: 'You cannot delete your own account here' });
    }

    try {
        const result = await db.query(
            `DELETE FROM users WHERE id = $1 RETURNING id, username`,
            [targetId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: `User "${result.rows[0].username}" deleted successfully` });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Database Error' });
    }
});

app.listen(PORT, () => {
    console.log('========================================');
    console.log('BACKEND SERVER STARTED');
    console.log(`PORT: ${PORT}`);
    console.log('========================================');
});