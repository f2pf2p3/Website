# User Registration Flow

1. The frontend validates the username, email, password length, uppercase requirement, and password confirmation.
2. It sends the registration details to `POST /api/register/request-otp`.
3. The backend hashes the password, creates a short-lived OTP challenge, and emails the code through the configured SMTP provider.
4. While the user is waiting for the OTP, the frontend hides both password fields and shows only the verification-code field.
5. The frontend sends the code to `POST /api/register/verify-otp`.
6. The backend verifies the code and inserts the new user into PostgreSQL. The user is then redirected to the login page.

OTP codes expire after 10 minutes and are limited to five verification attempts.

## Users Table

| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | PRIMARY KEY |
| username | VARCHAR(500) | NOT NULL, UNIQUE |
| password | VARCHAR(255) | NOT NULL |
| email | VARCHAR(100) | NOT NULL |
| role | VARCHAR(...) | Used for access control |
| created_at | TIMESTAMP | Set by the database |

## Q&A Section

Question: Why do I have to separate the **Frontend server** and **Backend server**?

Answer: The frontend serves HTML, CSS, and browser JavaScript. The backend handles API requests, authentication, OTP delivery, password hashing, and database access. Keeping those responsibilities separate is easier to develop and deploy securely.

Question: What does the **Frontend server** do?

Answer: It serves the pages and static assets in the `frontend` folder. The default local port is `3000`.

Question: What does the **Backend server** do?

Answer: It serves the authentication API, sends email OTPs, hashes passwords with bcrypt, signs login tokens, and reads and writes PostgreSQL data.

Question: Why are the **Backend server** and **Frontend server** on ports `5000` and `3000`?

Answer: They are separate local processes, so each needs its own port. The frontend calls the backend at `http://localhost:5000` during local development.

Question: What is in **.env**?

Answer: It contains server-only configuration such as `DATABASE_URL`, `JWT_SECRET`, and SMTP credentials. Do not commit this file or expose its values in frontend code.

Question: How do I run the **Backend server** locally?

Answer: Configure PostgreSQL and the required `.env` values, run `npm install` in `backend`, then run `npm start`.

Question: Do I need to run the **Frontend server** locally?

Answer: Yes, run `npm install` and `npm start` in `frontend`, then open `http://localhost:3000`. The frontend server is needed to serve the browser pages consistently.

## Store API

The storefront uses the backend catalog and authenticated shopping APIs:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/products` | Return the seeded product catalog and categories |
| `GET` | `/api/products/:id` | Return one product |
| `GET` | `/api/cart` | Return the signed-in user's bag |
| `POST` | `/api/cart/items` | Add a product to the bag |
| `DELETE` | `/api/cart/items/:productId` | Remove a product from the bag |
| `POST` | `/api/orders` | Confirm the current bag as an order |
| `GET` | `/api/orders` | Return the signed-in user's order history |

Catalog data and cart/order state are currently held in memory for the demo. A production deployment should move products, carts, and orders into PostgreSQL and add payment, inventory, shipping, and refund workflows.

## Purchase Notifications

When an authenticated order is confirmed, the backend sends an order summary to `shogunraiden2006@protonmail.com` when SMTP is configured. Configure these backend-only variables in `.env`:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=orders@example.com
ORDER_NOTIFICATION_EMAIL=shogunraiden2006@protonmail.com
```

LINE Business preparation is included through the official LINE Messaging API push endpoint. Add a LINE Developers channel access token and the recipient's LINE user ID to enable it:

```text
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
LINE_TO_USER_ID=your-line-user-id
```

The LINE channel must be configured in LINE Developers, and the recipient must have added the official account or otherwise be eligible to receive a push message. No LINE secrets are exposed to the frontend.

The admin dashboard is available at the backend URL `/index.html` after an admin login. It can add listings, delete listings, and switch each listing between `restock` and `out-of-stock`. Public visitors only see listings marked `restock`.
