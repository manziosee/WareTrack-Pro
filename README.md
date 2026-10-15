<div align="center">

# 📦 WareTrack-Pro

**Warehouse Delivery & Dispatch Tracking System**

Manage inventory, orders, vehicles, drivers and deliveries in one place, with a dashboard for every role.

[![Live App](https://img.shields.io/badge/Live_App-ware--track--pro.vercel.app-4682B4?style=for-the-badge&logo=vercel&logoColor=white)](https://ware-track-pro.vercel.app/)
[![API](https://img.shields.io/badge/API-onrender.com-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://waretrack-pro.onrender.com/)
[![API Docs](https://img.shields.io/badge/Swagger-API_Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://waretrack-pro.onrender.com/api-docs)
[![Postman](https://img.shields.io/badge/Postman-Collection-FF6C37?style=for-the-badge&logo=postman&logoColor=white)](./WareTrack-Pro-API.postman_collection.json)

![Version](https://img.shields.io/badge/version-2.3.0-FF8C42?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

</div>

---

## 📚 Contents

- [What it does](#-what-it-does)
- [Tech stack](#-tech-stack)
- [How the system works](#-how-the-system-works)
- [Roles and permissions](#-roles-and-permissions)
- [Getting started](#-getting-started)
- [Environment variables](#-environment-variables)
- [Deployment](#-deployment)
- [API documentation](#-api-documentation)
- [Security](#-security)
- [Project structure](#-project-structure)
- [What's new in 2.3.0](#-whats-new-in-230)

---

## ✨ What it does

| Area | Highlights |
|---|---|
| 📦 **Inventory** | Stock levels, categories, low-stock alerts, bulk import, barcode labels and phone scanning |
| 🏬 **Warehouses** | Several warehouses, stock per site, transfers, batches with expiry dates |
| 🛒 **Purchasing** | Suppliers, purchase orders, receiving, automatic restock of low items |
| 🧾 **Orders** | Table and Kanban board, delivery calendar, SLA deadlines, returns and failed deliveries |
| 🚚 **Dispatch** | Auto-dispatch to the best driver, optimised route order, live map of drivers |
| 📱 **Driver app** | Installable phone app: today's stops, navigation, signature and photo proof of delivery |
| 📍 **Tracking** | Public tracking page with live driver position and ETA; SMS and WhatsApp updates |
| 💳 **Payments** | MTN MoMo and Airtel Money requests, cash records, printable invoices |
| 📊 **Insights** | Role dashboards, demand forecast, driver scorecards, anomaly alerts, custom report builder |
| 💬 **Team** | Real-time chat, notification centre, audit log of every change |
| 👥 **Users** | Admin approval for new accounts, two-factor sign-in, English / Kinyarwanda / French |

---

## 🧰 Tech stack

### Frontend

![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![React Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=for-the-badge&logo=chartdotjs&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)

### Backend

![Node.js](https://img.shields.io/badge/Node.js_18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

### Services and tooling

![Render](https://img.shields.io/badge/Render-API_hosting-46E3B7?style=for-the-badge&logo=render&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Frontend_hosting-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Prisma Postgres](https://img.shields.io/badge/Prisma_Postgres-Database-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![EmailJS](https://img.shields.io/badge/EmailJS-Email_delivery-F37626?style=for-the-badge&logo=maildotru&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

| Layer | Technology | Purpose |
|---|---|---|
| UI | React 18, TypeScript, Tailwind CSS, Space Grotesk font | Role-based dashboards and forms |
| Charts | Recharts | Trends, distributions and KPIs |
| Data fetching | Axios, TanStack Query | API calls with caching and auto-refresh |
| API | Node.js 18, Express 4 | REST API with 100+ endpoints |
| Data access | Prisma ORM | Type-safe queries and migrations |
| Database | PostgreSQL on Prisma Postgres | Persistent storage |
| Auth | bcrypt, JWT, email OTP, TOTP | Password + emailed code or authenticator app |
| Real time | Socket.IO | Live map, chat, notifications |
| Maps | Leaflet + OpenStreetMap | Live map, route view, customer tracking |
| Email | Resend, Brevo or EmailJS (first one configured) | Login codes, password resets, alerts |
| SMS / WhatsApp | Africa's Talking, WhatsApp Cloud API | Customer delivery updates |
| Payments | MTN MoMo, Airtel Money | Mobile money collections |
| Monitoring | Sentry | Error reporting (optional) |
| Docs | Swagger UI / OpenAPI 3 | Interactive API reference |
| Hosting | Vercel (frontend), Render (API, Docker) | Production deployment |

---

## 🏗 How the system works

### Architecture

```mermaid
flowchart LR
    U["👤 Users<br/>(browser / phone)"] -->|HTTPS| FE["⚛️ React app<br/>Vercel"]
    FE -->|"REST /api + JWT"| API["🟢 Express API<br/>Render (Docker)"]
    API -->|Prisma ORM| DB[("🐘 PostgreSQL<br/>Prisma Postgres")]
    API -->|"Login codes,<br/>alerts"| EM["✉️ EmailJS"]
    EM --> U
    DEV["🧑‍💻 Developers"] -->|"Swagger / Postman"| API
```

1. **The frontend** (React on Vercel) shows each user the dashboard for their role.
2. **The API** (Express on Render) checks every request: valid token, active account, and permission for that role.
3. **Prisma** reads and writes the PostgreSQL database.
4. **EmailJS** sends login codes, password resets and notifications.
5. **A scheduler** checks inventory every 6 hours and raises low-stock and out-of-stock alerts.

### Sign-in flow

Every sign-in needs the password **and** a one-time code sent by email.

```mermaid
sequenceDiagram
    actor User
    participant App as React app
    participant API as Express API
    participant DB as PostgreSQL
    participant Mail as EmailJS

    User->>App: Email + password
    App->>API: POST /api/auth/login
    API->>DB: Find user, check password and status
    API->>Mail: Send 6-digit code (valid 5 min)
    Mail-->>User: Email with code
    User->>App: Enter code
    App->>API: POST /api/auth/verify-login-otp
    API-->>App: Access token (7 days) + refresh token (30 days)
    App->>API: Later requests with Bearer token
```

### Order lifecycle

```mermaid
flowchart LR
    A["🧾 Pending"] -->|"Dispatch officer assigns<br/>driver + vehicle"| B["🚚 Dispatched"]
    B -->|"Driver starts route"| C["📍 In transit"]
    C -->|"Driver confirms"| D["✅ Delivered"]
    A -.->|cancel| X["❌ Cancelled"]
    B -.->|cancel| X
```

---

## 👥 Roles and permissions

| Capability | Admin | Warehouse Staff | Dispatch Officer | Driver |
|---|:-:|:-:|:-:|:-:|
| Manage users, approve new accounts | ✅ | | | |
| System settings | ✅ | | | |
| Add / edit / delete inventory | ✅ | ✅ | | |
| Create / edit orders | ✅ | ✅ | ✅ | |
| Manage vehicles, drivers, dispatches | ✅ | | ✅ | |
| Update delivery status | ✅ | ✅ | ✅ | ✅ |
| Reports and analytics | ✅ | ✅ | ✅ | |
| Own profile and password | ✅ | ✅ | ✅ | ✅ |

These rules are enforced by the API, not only hidden in the interface.

> **New accounts:** the first account ever created becomes the Admin. Everyone who signs up after that starts **inactive**, and an Admin activates them from the Users page.

---

## 🚀 Getting started

### Requirements

- Node.js 18 or newer
- PostgreSQL 14 or newer (local, Docker, or a hosted database)
- An EmailJS account, to receive login codes

### 1. Clone

```bash
git clone https://github.com/manziosee/WareTrack-Pro.git
cd WareTrack-Pro
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # then fill in your values (see below)
npx prisma generate
npx prisma migrate dev
npm run dev                 # http://localhost:5000
```

Optional sample data for **local development only**:

```bash
npx prisma db seed
```

> ⚠️ The seed creates demo accounts with well-known passwords. Never run it against a production database.

### 3. Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:5000/api" > .env
npm run dev                 # http://localhost:3001
```

### Docker (alternative)

```bash
docker-compose up -d
```

---

## 🔐 Environment variables

Backend (`backend/.env`; never commit this file):

| Variable | Required | Description |
|---|:-:|---|
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | | Port to listen on (default `8080`, Render uses `5000`) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | At least 32 random characters. Generate one with `openssl rand -hex 48` |
| `JWT_EXPIRE` | | Access-token lifetime, e.g. `7d` |
| `FRONTEND_URL` | ✅ | Frontend address allowed by CORS, e.g. `https://ware-track-pro.vercel.app` |
| `CORS_ORIGINS` | | Extra allowed origins, comma-separated |
| `API_RATE_LIMIT_PER_15_MIN` | | General per-IP request limit (default `1000`) |

**Email** (at least one provider is needed for login codes; the first one configured is used):

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | [Resend](https://resend.com) key (preferred) |
| `BREVO_API_KEY` | [Brevo](https://brevo.com) key |
| `EMAIL_FROM` | Sender for Resend/Brevo, e.g. `WareTrack Pro <no-reply@yourdomain.rw>` (domain must be verified) |
| `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY` | EmailJS fallback (template subject `WareTrack-Pro: {{title}}`, recipient `{{email}}`) |

**Optional integrations** (each feature switches off quietly when its keys are missing; Settings → Integrations shows which are active):

| Variable | Description |
|---|---|
| `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID` | Africa's Talking SMS (use username `sandbox` for testing) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API |
| `MOMO_SUBSCRIPTION_KEY`, `MOMO_API_USER`, `MOMO_API_KEY`, `MOMO_TARGET_ENV`, `MOMO_BASE_URL`, `MOMO_CURRENCY` | MTN MoMo Collections |
| `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET`, `AIRTEL_BASE_URL`, `AIRTEL_COUNTRY`, `AIRTEL_CURRENCY` | Airtel Money |
| `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` | Sentry error reporting for the API |
| `AUTO_RESTOCK` | `true` lets the daily job create purchase orders for low stock automatically |
| `RUN_JOBS` | `true` runs the background jobs outside production (SLA checks, anomalies, scheduled reports) |

The server **refuses to start in production** if `DATABASE_URL` or `JWT_SECRET` is missing, or if `JWT_SECRET` is shorter than 32 characters.

Frontend (Vercel environment variable):

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL, e.g. `https://waretrack-pro.onrender.com/api` |
| `VITE_SENTRY_DSN` | Optional Sentry DSN for frontend errors |

---

## ☁️ Deployment

| Part | Platform | How |
|---|---|---|
| API | [Render](https://render.com) | Docker web service from `backend/` (see [`render.yaml`](render.yaml)) |
| Frontend | [Vercel](https://vercel.com) | Vite build from `frontend/` |
| Database | [Prisma Postgres](https://www.prisma.io/postgres) | Managed PostgreSQL |

### API on Render

1. **New → Web Service**, connect this repository.
2. **Root Directory:** `backend` · **Runtime:** Docker · **Dockerfile Path:** `./Dockerfile`
3. **Health Check Path:** `/health`
4. Add the environment variables from the table above.
5. Deploy. Every push to `main` redeploys automatically.

Alternatively, create it from the [`render.yaml`](render.yaml) Blueprint. Secrets are left for you to fill in, in the dashboard.

> The free Render plan sleeps after 15 minutes without traffic, so the first request afterwards can take around 50 seconds. The frontend waits up to 75 seconds for it.

### Frontend on Vercel

1. Import the repository and set **Root Directory** to `frontend`.
2. Set `VITE_API_URL` to `https://waretrack-pro.onrender.com/api`.
3. Deploy.

### GitHub Actions

| Workflow | What it does | Setup |
|---|---|---|
| `ci.yml` | Type-checks, tests and builds backend and frontend on every push and pull request | None |
| `keep-alive.yml` | Pings `/health` every 10 minutes during working hours (06:00–21:00 Kigali, Monday–Saturday) so the free Render service stays awake | None |
| `db-backup.yml` | Nightly `pg_dump` of the database, kept as a workflow artifact for 14 days | Add the repository secret `DATABASE_URL` |

---

## 📖 API documentation

| Resource | Link |
|---|---|
| API info | [waretrack-pro.onrender.com](https://waretrack-pro.onrender.com/) |
| Health check | [/health](https://waretrack-pro.onrender.com/health) |
| Swagger UI | [/api-docs](https://waretrack-pro.onrender.com/api-docs) |
| OpenAPI JSON | [/api-docs.json](https://waretrack-pro.onrender.com/api-docs.json) |
| Postman | [`WareTrack-Pro-API.postman_collection.json`](./WareTrack-Pro-API.postman_collection.json) |

### Using the Postman collection (v2.3.0)

1. Import the collection into Postman.
2. In the collection variables, set `email` and `password`.
3. Run **Authentication → POST auth/login**. A code is emailed to you.
4. Put the code in `otp` and run **POST auth/verify-login-otp**. The tokens are saved for every other request.

Each request's description says which roles may call it. Every path also works under `/api/v1/...`.

### Main endpoint groups

| Group | Base path |
|---|---|
| Authentication | `/api/auth` |
| Password reset | `/api/password-reset` |
| Dashboard | `/api/dashboard` |
| Users (admin) | `/api/users` |
| Inventory | `/api/inventory` |
| Orders | `/api/orders` |
| Vehicles | `/api/vehicles` |
| Drivers | `/api/drivers` |
| Dispatch | `/api/dispatch` |
| Notifications | `/api/notifications` |
| Reports | `/api/reports` |
| Analytics | `/api/analytics` |
| Settings | `/api/settings` |
| Advanced features (customer portal, proof of delivery, barcodes) | `/api/features` |
| Dashboard insights | `/api/insights` |
| Warehouses, transfers, suppliers, purchase orders, batches | `/api/warehouses`, `/api/transfers`, `/api/suppliers`, `/api/purchase-orders`, `/api/batches` |
| Routes, auto-dispatch, driver app, calendar, live map, returns | `/api/routes`, `/api/auto-dispatch`, `/api/my-deliveries`, `/api/calendar`, `/api/live-map`, `/api/returns` |
| Public order tracking (no sign-in) | `/api/public/track/:orderNumber` |
| Payments and invoices | `/api/payments`, `/api/invoices` |
| Forecast, scorecards, anomalies | `/api/intelligence` |
| Chat | `/api/chat` |
| Two-factor, webhooks, report builder | `/api/auth/2fa`, `/api/webhooks`, `/api/report-builder`, `/api/saved-reports` |
| Audit log, saved filters | `/api/audit`, `/api/saved-filters` |

---

## 🛡 Security

- **Two-step sign-in:** password plus a 6-digit email code (stored hashed in the database, expires in 5 minutes, cancelled after 5 wrong tries), or an authenticator-app code for users who turn on two-factor.
- **Audit log** of every create, update and delete, with who did it and from where.
- **Signed webhooks:** each delivery carries an HMAC-SHA256 signature in `X-WareTrack-Signature`.
- **Rate limits:** 5 login attempts per 15 minutes and 10 code checks per 5 minutes per IP, plus a general API limit.
- **Role checks on the server** for every create, update and delete.
- **Live account checks:** deactivating a user or changing their role takes effect within 30 seconds, even for tokens already issued.
- **Admin approval** for new sign-ups, which never receive tokens directly.
- **Refresh tokens can't be used as access tokens.**
- **No insecure defaults:** no fallback JWT secret, and the server won't start in production without its required secrets.
- **CORS** limited to the configured frontend address.
- **Helmet** security headers on the API and security headers on the Vercel frontend.
- **Request size limit** of 1 MB, and production errors never expose internal details.
- **Passwords** hashed with bcrypt; at least 8 characters with letters and numbers.
- **Customer portal** requests are limited to the signed-in customer's own orders.

**Keep secrets out of Git.** Put real values only in `.env` (git-ignored) or in your hosting dashboards. If a key is ever committed, regenerate it.

---

## 🗂 Project structure

```
WareTrack-Pro/
├── backend/                  Express API
│   ├── prisma/               Schema, migrations, local seed
│   ├── src/
│   │   ├── config/           Environment checks, Swagger setup
│   │   ├── controllers/      Request handlers
│   │   ├── middleware/       Auth, roles, errors, inventory alerts
│   │   ├── routes/           Endpoint definitions (+ Swagger docs)
│   │   ├── services/         Email, SMS, payments, routing, forecasting, jobs, real time
│   │   └── server.ts         Entry point
│   └── Dockerfile
├── frontend/                 React app
│   └── src/
│       ├── components/       UI kit, charts, forms, layout
│       ├── i18n/             English, Kinyarwanda and French text
│       ├── pages/            Screens and role dashboards
│       ├── services/         API clients
│       └── utils/            Formatting and PDF/CSV/JSON export
├── frontend/public/          PWA manifest, service worker, app icons
├── .github/workflows/        CI, keep-alive, nightly backup
├── render.yaml               Render Blueprint for the API
├── docker-compose.yml        Local stack
└── WareTrack-Pro-API.postman_collection.json
```

---

## 🆕 What's new in 2.3.0

**Operations**
- Live map of drivers and deliveries, Kanban order board, delivery calendar.
- Route optimisation and auto-dispatch to the best available driver and vehicle.
- Delivery deadlines (SLA) with at-risk alerts; returns and failed deliveries with rescheduling.
- Driver phone app (installable PWA): today's stops, navigation, signature and photo proof of delivery, location sharing.
- Barcode and QR scanning with the phone camera; printable item labels.
- Public tracking page with live driver position and ETA; SMS and WhatsApp updates to customers.

**Stock and money**
- Multiple warehouses, stock transfers, batches with expiry dates.
- Suppliers and purchase orders, receiving, optional automatic restock.
- MTN MoMo and Airtel Money payment requests, cash records, printable invoices.

**Insights**
- More charts on every role's dashboard, sparklines, customisable cards and a greeting with Kigali weather.
- Demand forecast, driver scorecards, anomaly alerts and a custom report builder with scheduled emails.

**Team and platform**
- Real-time chat and notification centre; English, Kinyarwanda and French.
- Command palette (Ctrl+K), collapsible sidebar, breadcrumbs, phone tab bar, undo for deletes.
- Tables with sorting, column choice, density, bulk actions and saved filters; slide-in detail panels with history.
- Two-factor sign-in with an authenticator app, audit log, signed webhooks, `/api/v1` paths.
- Resend and Brevo email support, Sentry, CI, keep-alive and nightly backups.
- Smaller text throughout; light theme only.

## What was new in 2.2.0

**Hosting**
- API moved from Fly.io to **Render**; frontend points to `https://waretrack-pro.onrender.com/api`.
- Root (`/`) and `/api` pages, `/api-docs.json`, and a health check that reports database status.

**Security**
- Role-based permissions enforced on every write endpoint.
- New sign-ups need admin approval and no longer receive tokens directly.
- Account status and role re-checked on each request (30-second cache).
- No fallback JWT secret; startup fails without required secrets.
- CORS limited to the frontend; general API rate limit; 1 MB body limit.
- Customer portal secured; public tracking no longer exposes delivery codes or signatures.
- Stronger password rule (8+ characters with letters and numbers).

**Stability**
- A database hiccup during inventory checks no longer crashes the server.
- SQL query logging is off in production.
- Consistent JSON errors and 404s.

**Design**
- Space Grotesk typography, new charts, redesigned detail pop-ups, branded PDF reports, refreshed landing page.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feature/my-feature`.
3. Commit your changes and push the branch.
4. Open a pull request.

---

## 📄 License

MIT. See [LICENSE](LICENSE).

## 👨‍💻 Author

**manziosee**: [github.com/manziosee](https://github.com/manziosee)

<div align="center">

⭐ **Star the repository if you find it useful!**

</div>
