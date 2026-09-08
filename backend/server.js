const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const otpChallenges = new Map();
const carts = new Map();
const orders = new Map();
const orderStatuses = ['Pending', 'Paid', 'Confirmed', 'Delivered', 'Cancelled', 'Refunded'];
const runtimeSettings = {
    orderNotificationEmail: process.env.ORDER_NOTIFICATION_EMAIL || 'shogunraiden2006@protonmail.com',
    lineNotificationsEnabled: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_TO_USER_ID)
};
const products = [
    {
        id: 'neon-vanguard',
        name: 'Neon Vanguard',
        category: 'FPS',
        price: 129,
        badge: 'Ranked ready',
        description: 'Competitive FPS account with a clean history and starter cosmetics.',
        color: '#67e8f9',
        mode: 'restock'
    },
    {
        id: 'mythic-realms',
        name: 'Mythic Realms',
        category: 'MMORPG',
        price: 86,
        badge: 'Level 80',
        description: 'Endgame character with a complete starter build and rare mount.',
        color: '#a78bfa',
        mode: 'restock'
    },
    {
        id: 'kingdom-forged',
        name: 'Kingdom Forged',
        category: 'Strategy',
        price: 740,
        badge: 'Maxed roster',
        description: 'Fully upgraded strategy profile with a deep unlock library.',
        color: '#fbbf24',
        mode: 'restock'
    },
    {
        id: 'pixel-arcade',
        name: 'Pixel Arcade',
        category: 'Indie',
        price: 58,
        badge: 'Collector',
        description: 'Curated indie library account with a stack of acclaimed favorites.',
        color: '#fb7185',
        mode: 'restock'
    },
    {
        id: 'drift-league',
        name: 'Drift League',
        category: 'Racing',
        price: 42,
        badge: 'Garage built',
        description: 'Racing profile with tuned vehicles, credits, and custom paint jobs.',
        color: '#fb923c',
        mode: 'out-of-stock'
    },
    {
        id: 'shadow-ops',
        name: 'Shadow Ops',
        category: 'Action',
        price: 64,
        badge: 'Loadout ready',
        description: 'Action account with unlocked loadouts and a polished cosmetic set.',
        color: '#4ade80',
        mode: 'restock'
    }
];

function addDefaultProductMedia(product) {
    if (!Array.isArray(product.images) || product.images.length < 2) {
        const label = encodeURIComponent(product.name);
        product.images = [
            `https://placehold.co/900x700/111827/67e8f9?text=${label}`,
            `https://placehold.co/900x700/1e293b/a78bfa?text=${encodeURIComponent(product.category + ' preview')}`
        ];
    }
    if (!product.longDescription) {
        product.longDescription = `${product.description} This listing includes the advertised progression, unlocks, and access details shown in the account handover notes. Review the listing carefully before checkout.`;
    }
    return product;
}

products.forEach(addDefaultProductMedia);

if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not configured; generated a temporary secret for this process.');
}

app.use(cors());
app.use(express.json({
    verify: (req, res, buffer) => {
        req.rawBody = buffer;
    }
}));
app.get('/server.js', (req, res) => res.sendStatus(404));
app.use(express.static(__dirname, { dotfiles: 'deny', index: false }));


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
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    })
    : null;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_TO_USER_ID = process.env.LINE_TO_USER_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

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

function isSmtpError(error) {
    return error.message === 'SMTP is not configured'
        || Boolean(error.code && ['EAUTH', 'ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET'].includes(error.code))
        || Boolean(error.responseCode)
        || Boolean(error.command);
}

async function notifyLine(message) {
    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_TO_USER_ID) return;
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            to: LINE_TO_USER_ID,
            messages: [{ type: 'text', text: message }]
        })
    });
    if (!response.ok) throw new Error(`LINE notification failed with ${response.status}`);
}

async function notifyOrder(order, user) {
    const itemLines = order.items.map((item) => `- ${item.product.name} x${item.quantity} ($${(item.product.price * item.quantity).toFixed(2)})`).join('\n');
    const message = [
        'GAMEVAULT / NEW PURCHASE',
        '========================',
        `Order ID : ${order.id}`,
        `Customer : ${user.username}`,
        `Email    : ${user.email || 'not available'}`,
        `Channel  : ${order.shipping}`,
        `Total    : $${order.total.toFixed(2)}`,
        '',
        'ITEMS',
        itemLines,
        '========================',
        'Action required: review and fulfill this order.'
    ].join('\n');
    const tasks = [];
    if (mailer && process.env.SMTP_FROM) {
        tasks.push(mailer.sendMail({
            from: process.env.SMTP_FROM,
            to: runtimeSettings.orderNotificationEmail,
            subject: `[GameVault] New order ${order.id}`,
            text: `${message}\n\nCustomer email: ${user.email || 'not available'}`
        }));
    } else {
        console.warn('Order email skipped because SMTP is not configured.');
    }
    if (runtimeSettings.lineNotificationsEnabled) tasks.push(notifyLine(message));
    const results = await Promise.allSettled(tasks);
    results.filter((result) => result.status === 'rejected').forEach((result) => console.error('Order notification failed:', result.reason));
}

async function notifyOrderStatus(order) {
    if (!runtimeSettings.lineNotificationsEnabled) return;
    const message = [
        'GAMEVAULT / ORDER UPDATE',
        '========================',
        `Order ID : ${order.id}`,
        `Status   : ${order.status}`,
        `Total    : $${order.total.toFixed(2)}`,
        '========================'
    ].join('\n');
    try {
        await notifyLine(message);
    } catch (error) {
        console.error('Order status notification failed:', error);
    }
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

function getCart(userId) {
    if (!carts.has(userId)) carts.set(userId, []);
    return carts.get(userId);
}

function serializeCart(userId) {
    const cart = getCart(userId);
    const items = cart.map((item) => ({
        ...item,
        product: products.find((product) => product.id === item.productId)
    })).filter((item) => item.product);
    return {
        items,
        count: items.reduce((total, item) => total + item.quantity, 0),
        total: items.reduce((total, item) => total + item.product.price * item.quantity, 0)
    };
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Backend is running' }));
app.get('/favicon.ico', (req, res) => res.sendStatus(204));

app.post('/api/line/webhook', (req, res) => {
    if (LINE_CHANNEL_SECRET) {
        const signature = req.get('x-line-signature');
        const digest = crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(req.rawBody || Buffer.from('')).digest('base64');
        if (!signature || signature.length !== digest.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
            return res.sendStatus(401);
        }
    }
    console.log('LINE webhook received:', req.body?.events?.length || 0, 'event(s)');
    return res.sendStatus(200);
});

app.get('/api/products', (req, res) => {
    const category = req.query.category;
    const includeUnavailable = req.query.includeUnavailable === 'true';
    const result = category && category !== 'All'
        ? products.filter((product) => product.category === category)
        : products;
    const visibleProducts = includeUnavailable ? result : result.filter((product) => product.mode !== 'out-of-stock');
    res.json({ products: visibleProducts, categories: ['All', ...new Set(products.map((product) => product.category))] });
});

app.get('/api/products/:id', (req, res) => {
    const product = products.find((item) => item.id === req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.json({ product });
});

app.post('/api/admin/products', authenticateToken, requireAdmin, (req, res) => {
    const { name, category, price, badge, description, longDescription, images, color, mode } = req.body;
    const numericPrice = Number(price);
    if (!name?.trim() || !category?.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ message: 'Name, category, and a valid price are required.' });
    }
    const id = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const product = {
        id,
        name: name.trim(),
        category: category.trim(),
        price: numericPrice,
        badge: badge?.trim() || 'New drop',
        description: description?.trim() || 'Curated game account ready for its next player.',
        longDescription: longDescription?.trim() || '',
        images: Array.isArray(images) ? images.filter((image) => typeof image === 'string' && image.trim()).slice(0, 8) : [],
        color: color || '#67e8f9',
        mode: mode === 'out-of-stock' ? 'out-of-stock' : 'restock'
    };
    addDefaultProductMedia(product);
    products.push(product);
    return res.status(201).json({ product });
});

app.patch('/api/admin/products/:id', authenticateToken, requireAdmin, (req, res) => {
    const product = products.find((item) => item.id === req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (req.body.mode && !['restock', 'out-of-stock'].includes(req.body.mode)) {
        return res.status(400).json({ message: 'Mode must be restock or out-of-stock.' });
    }
    Object.assign(product, {
        ...(req.body.name !== undefined ? { name: String(req.body.name).trim() } : {}),
        ...(req.body.category !== undefined ? { category: String(req.body.category).trim() } : {}),
        ...(req.body.price !== undefined ? { price: Number(req.body.price) } : {}),
        ...(req.body.badge !== undefined ? { badge: String(req.body.badge).trim() } : {}),
        ...(req.body.description !== undefined ? { description: String(req.body.description).trim() } : {}),
        ...(req.body.longDescription !== undefined ? { longDescription: String(req.body.longDescription).trim() } : {}),
        ...(req.body.images !== undefined ? { images: Array.isArray(req.body.images) ? req.body.images.filter((image) => typeof image === 'string' && image.trim()).slice(0, 8) : [] } : {}),
        ...(req.body.color !== undefined ? { color: String(req.body.color) } : {}),
        ...(req.body.mode !== undefined ? { mode: req.body.mode } : {})
    });
    addDefaultProductMedia(product);
    return res.json({ product });
});

app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, (req, res) => {
    const index = products.findIndex((item) => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Product not found' });
    const [product] = products.splice(index, 1);
    return res.json({ message: `${product.name} deleted`, product });
});

app.get('/api/cart', authenticateToken, (req, res) => res.json(serializeCart(req.user.id)));

app.post('/api/cart/items', authenticateToken, (req, res) => {
    const product = products.find((item) => item.id === req.body.productId);
    const quantity = Number(req.body.quantity || 1);
    if (!product || product.mode === 'out-of-stock' || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return res.status(400).json({ message: 'Choose a valid product and quantity.' });
    }
    const cart = getCart(req.user.id);
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) existing.quantity = Math.min(existing.quantity + quantity, 10);
    else cart.push({ productId: product.id, quantity });
    return res.status(201).json(serializeCart(req.user.id));
});

app.delete('/api/cart/items/:productId', authenticateToken, (req, res) => {
    const cart = getCart(req.user.id);
    carts.set(req.user.id, cart.filter((item) => item.productId !== req.params.productId));
    return res.json(serializeCart(req.user.id));
});

app.post('/api/orders', authenticateToken, (req, res) => {
    const cart = serializeCart(req.user.id);
    if (!cart.items.length) return res.status(400).json({ message: 'Your cart is empty.' });
    const unavailableItem = cart.items.find((item) => item.product.mode === 'out-of-stock');
    if (unavailableItem) return res.status(409).json({ message: `${unavailableItem.product.name} is out of stock.` });
    const order = {
        id: `ORD-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        status: 'Confirmed',
        total: cart.total,
        items: cart.items,
        shipping: req.body.shipping || 'Studio pickup',
        customer: { id: req.user.id, username: req.user.username, email: req.user.email || null }
    };
    if (!orders.has(req.user.id)) orders.set(req.user.id, []);
    orders.get(req.user.id).unshift(order);
    carts.set(req.user.id, []);
    notifyOrder(order, req.user).catch((error) => console.error('Could not send order notifications:', error));
    return res.status(201).json({ order });
});

app.get('/api/orders', authenticateToken, (req, res) => res.json({ orders: orders.get(req.user.id) || [] }));

app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => {
    const result = [];
    orders.forEach((userOrders) => userOrders.forEach((order) => result.push(order)));
    result.sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
    return res.json({ orders: result, statuses: orderStatuses });
});

app.patch('/api/admin/orders/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const status = String(req.body.status || '');
    if (!orderStatuses.includes(status)) return res.status(400).json({ message: 'Invalid order status.' });
    let target = null;
    orders.forEach((userOrders) => userOrders.forEach((order) => {
        if (order.id === req.params.id) target = order;
    }));
    if (!target) return res.status(404).json({ message: 'Order not found.' });
    target.status = status;
    target.updatedAt = new Date().toISOString();
    notifyOrderStatus(target);
    return res.json({ order: target });
});

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
        if (isSmtpError(error)) {
            otpChallenges.delete(`register:${emailTrimmed.toLowerCase()}`);
            console.error('Registration SMTP error:', { code: error.code, responseCode: error.responseCode, command: error.command });
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

    // Validate email and OTP format
    if (!email || !/^\d{6}$/.test(otp || '')) {
        return res.status(400).json({
            message: 'Enter the six-digit verification code'
        });
    }

    try {
        // Find and consume the OTP challenge
        const challenge = consumeChallenge(
            `register:${email.trim().toLowerCase()}`,
            otp
        );

        // OTP does not exist or has expired
        if (!challenge) {
            return res.status(400).json({
                message: 'Invalid or expired verification code'
            });
        }

        // Create the user after successful OTP verification
        const result = await db.query(
            `
            INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, username, email, role
            `,
            [
                challenge.username,
                challenge.email,
                challenge.passwordHash
            ]
        );

        return res.status(201).json({
            status: 'success',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Register verification error:', error);

        return res.status(500).json({
            message: 'Could not complete registration'
        });
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
                { id: user.id, username: user.username, email: user.email, role: user.role },
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
        if (isSmtpError(error)) {
            if (loginUserId) otpChallenges.delete(`login:${loginUserId}`);
            console.error('Login SMTP error:', { code: error.code, responseCode: error.responseCode, command: error.command });
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
            { id: user.id, username: user.username, email: user.email, role: user.role },
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

app.get('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
    return res.json({
        orderNotificationEmail: runtimeSettings.orderNotificationEmail,
        lineNotificationsEnabled: runtimeSettings.lineNotificationsEnabled,
        lineWebhookPath: '/api/line/webhook',
        smtpConfigured: Boolean(mailer && process.env.SMTP_FROM),
        databaseConfigured: Boolean(process.env.DATABASE_URL)
    });
});

app.patch('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
    if (req.body.orderNotificationEmail !== undefined) {
        const email = String(req.body.orderNotificationEmail).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid notification email.' });
        runtimeSettings.orderNotificationEmail = email;
    }
    if (req.body.lineNotificationsEnabled !== undefined) {
        runtimeSettings.lineNotificationsEnabled = Boolean(req.body.lineNotificationsEnabled) && Boolean(LINE_CHANNEL_ACCESS_TOKEN && LINE_TO_USER_ID);
    }
    return res.json({
        orderNotificationEmail: runtimeSettings.orderNotificationEmail,
        lineNotificationsEnabled: runtimeSettings.lineNotificationsEnabled,
        lineWebhookPath: '/api/line/webhook',
        smtpConfigured: Boolean(mailer && process.env.SMTP_FROM),
        databaseConfigured: Boolean(process.env.DATABASE_URL)
    });
});