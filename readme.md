# GameVault Deployment Guide

GameVault is a dark game-account storefront with:

- Frontend catalog, product galleries, long descriptions, bag, checkout, login, registration, and account history.
- Node.js/Express backend with PostgreSQL authentication, OTP email verification, catalog, cart, orders, admin APIs, and LINE notifications.
- Admin console for users, listings, stock mode, orders, API status, and notification settings.

## Project Layout

```text
frontend/  Public storefront and account pages
backend/   Express API, admin console, authentication, and notifications
```

The current catalog, carts, and orders are stored in memory. PostgreSQL currently stores users. For a production store, move catalog, inventory, carts, and orders into PostgreSQL before using multiple server instances or relying on data after a restart.

## Requirements

- Node.js 20 or newer
- A PostgreSQL database, such as Neon
- An SMTP provider, such as Brevo, for OTP and order email
- A LINE Messaging API channel for LINE notifications

## Local Development

Open two terminals from the project root.

Backend:

```powershell
cd backend
npm install
npm start
```

Frontend:

```powershell
cd frontend
npm install
npm start
```

Open the storefront at `http://localhost:3000/index.html`.

The backend runs at `http://localhost:5000`. Confirm it is alive:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Expected response:

```json
{"status":"ok","message":"Backend is running"}
```

## Backend Environment

Create `backend/.env`. Never commit this file or paste its secrets into source code.

```env
PORT=5000
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
JWT_SECRET=generate-a-long-random-secret
JWT_EXPIRES_IN=7d

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=GameVault <orders@example.com>
ORDER_NOTIFICATION_EMAIL=your-order-notification-email@example.com

LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_TO_USER_ID=Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

`LINE_CHANNEL_ACCESS_TOKEN` is issued from LINE Developers under the Messaging API tab. It is different from the Channel ID and Channel Secret. `LINE_TO_USER_ID` is the recipient's LINE user ID, not the bot's ID.

## PostgreSQL Setup

The backend expects a `users` table. Run an equivalent migration in the selected PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS users (
id SERIAL PRIMARY KEY,
username VARCHAR(500) NOT NULL UNIQUE,
email VARCHAR(255) NOT NULL UNIQUE,
password VARCHAR(255) NOT NULL,
role VARCHAR(40) NOT NULL DEFAULT 'user',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

After creating an account, promote the administrator directly in PostgreSQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

## Render Deployment

### 1. Deploy the backend

Create a Render **Web Service** connected to the repository:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Add every backend environment variable from the previous section in Render. Do not commit `.env` to the repository.

After deployment, test:

```text
https://YOUR-BACKEND.onrender.com/api/health
https://YOUR-BACKEND.onrender.com/api/products
```

### 2. Deploy the frontend

Create a second Render **Static Site**:

```text
Root Directory: frontend
Build Command: leave empty
Publish Directory: .
```

The frontend automatically calls `http://localhost:5000` on localhost and the configured deployed backend URL on non-local hosts. Update `API_URL` in the frontend JavaScript files if your Render backend URL differs from the current one.

A second Render Web Service also works:

```text
Root Directory: frontend
Build Command: npm install
Start Command: npm start
```

### 3. Configure the LINE webhook

After the backend is deployed, enter this URL in LINE Developers:

```text
https://YOUR-BACKEND.onrender.com/api/line/webhook
```

Enable **Use webhook** and press **Verify**. The backend validates `x-line-signature` using `LINE_CHANNEL_SECRET` and returns `200 OK` for valid LINE requests.

### 4. Configure CORS and domain access

The current backend allows all origins for development. Before production, restrict `cors()` to the deployed frontend origin. The frontend and backend must both use HTTPS in production.

## Admin Console

After signing in with an account whose PostgreSQL role is `admin`, open:

```text
https://YOUR-BACKEND.onrender.com/index.html
```

The admin console provides:

- **Users:** list and delete users, with self-delete protection.
- **Listings:** create/delete accounts, set `restock` or `out-of-stock`, add long descriptions, and add one image URL per line.
- **Orders:** list orders and set `Pending`, `Paid`, `Confirmed`, `Delivered`, `Cancelled`, or `Refunded`.
- **API:** inspect non-secret service status and endpoint capabilities.
- **Settings:** change the order email and enable or disable LINE notifications for the current server session.

## API Reference

Public endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/products` | Public in-stock catalog |
| `GET` | `/api/products/:id` | Product detail |
| `POST` | `/api/login` | Start password/OTP login |
| `POST` | `/api/register/request-otp` | Start registration OTP |
| `POST` | `/api/register/verify-otp` | Complete registration |
| `POST` | `/api/login/verify-otp` | Complete login |
| `POST` | `/api/line/webhook` | Receive signed LINE events |

Authenticated customer endpoints require `Authorization: Bearer <JWT>`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/me` | Current account |
| `GET` | `/api/cart` | Current bag |
| `POST` | `/api/cart/items` | Add an in-stock listing |
| `DELETE` | `/api/cart/items/:productId` | Remove a listing |
| `POST` | `/api/orders` | Confirm the bag as an order |
| `GET` | `/api/orders` | Customer order history |

Admin endpoints require the same JWT with `role=admin`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/users` | List users |
| `DELETE` | `/api/users/:id` | Delete another user |
| `GET` | `/api/admin/products?includeUnavailable=true` | List all listings |
| `POST` | `/api/admin/products` | Create a listing |
| `PATCH` | `/api/admin/products/:id` | Edit listing data or stock mode |
| `DELETE` | `/api/admin/products/:id` | Delete a listing |
| `GET` | `/api/admin/orders` | List all orders |
| `PATCH` | `/api/admin/orders/:id/status` | Change order status |
| `GET` | `/api/admin/settings` | Read service configuration status |
| `PATCH` | `/api/admin/settings` | Change runtime notification settings |

## Troubleshooting 401

`401 Unauthorized` is expected when opening protected endpoints directly without a token:

- `/api/me`
- `/api/cart`
- `/api/orders`
- `/api/admin/*`

Open the frontend login page first. After successful login, the frontend stores the JWT in `localStorage` and sends it as `Authorization: Bearer <token>`.

Common causes:

1. The user has not signed in.
2. The JWT expired or `JWT_SECRET` changed between deployments.
3. An admin page was opened directly without the admin login redirect.
4. The frontend still points to an old backend URL.
5. Login credentials are invalid. In that case `/api/login` returns a login error rather than creating a session.

Check the deployed backend health endpoint and browser Network panel to identify the exact URL returning `401`.

## Security Checklist

- Rotate any secret that was shared publicly or committed accidentally.
- Use a strong persistent `JWT_SECRET` in Render.
- Keep SMTP, database, LINE, and JWT secrets backend-only.
- Restrict CORS to the frontend domain before production.
- Move products, carts, orders, and OTP challenges from memory into PostgreSQL or another shared store.
- Add a real payment provider and inventory reservation before accepting real payments.
