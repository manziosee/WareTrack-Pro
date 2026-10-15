<div align="center">

# 📦 WareTrack-Pro

**Warehouse Delivery & Dispatch Tracking System**

Manage inventory, orders, vehicles, drivers and deliveries in one place, with a dashboard for every role.

[![Live App](https://img.shields.io/badge/Live_App-ware--track--pro.vercel.app-4682B4?style=for-the-badge&logo=vercel&logoColor=white)](https://ware-track-pro.vercel.app/)
[![API](https://img.shields.io/badge/API-onrender.com-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://waretrack-pro.onrender.com/)
[![API Docs](https://img.shields.io/badge/Swagger-API_Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://waretrack-pro.onrender.com/api-docs)
[![Postman](https://img.shields.io/badge/Postman-Collection-FF6C37?style=for-the-badge&logo=postman&logoColor=white)](./WareTrack-Pro-API.postman_collection.json)

![Version](https://img.shields.io/badge/version-2.2.0-FF8C42?style=flat-square)
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
- [What's new in 2.2.0](#-whats-new-in-220)

---

## ✨ What it does

| Area | Highlights |
|---|---|
| 📦 **Inventory** | Stock levels, categories, low-stock and out-of-stock alerts, bulk import, barcodes |
| 🧾 **Orders** | Create orders from live inventory, track each stage from pending to delivered |
| 🚚 **Dispatch** | Assign drivers and vehicles, schedule deliveries, update status on the road |
| 🛻 **Fleet** | Vehicles, maintenance schedules, driver profiles and performance |
| 📍 **Tracking** | Follow every delivery, with a public tracking lookup for customers |
| 📊 **Reports** | Delivery trends, status breakdowns, inventory by category, KPIs; export to PDF, CSV or JSON |
| 🔔 **Notifications** | In-app alerts and email notifications |
| 👥 **Users** | Role-based dashboards, admin approval for new accounts |

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
| Auth | bcrypt, JWT, email OTP | Password + one-time code sign-in |
| Email | EmailJS | Login codes, password resets, alerts |
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
| `EMAILJS_SERVICE_ID` | ✅ | EmailJS service |
| `EMAILJS_TEMPLATE_ID` | ✅ | EmailJS template (subject `WareTrack-Pro: {{title}}`, recipient `{{email}}`) |
| `EMAILJS_PUBLIC_KEY` | ✅ | EmailJS public key |
| `EMAILJS_PRIVATE_KEY` | ✅ | EmailJS private key |
| `API_RATE_LIMIT_PER_15_MIN` | | General per-IP request limit (default `1000`) |

The server **refuses to start in production** if `DATABASE_URL` or `JWT_SECRET` is missing, or if `JWT_SECRET` is shorter than 32 characters.

Frontend (Vercel environment variable):

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL, e.g. `https://waretrack-pro.onrender.com/api` |

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

---

## 📖 API documentation

| Resource | Link |
|---|---|
| API info | [waretrack-pro.onrender.com](https://waretrack-pro.onrender.com/) |
| Health check | [/health](https://waretrack-pro.onrender.com/health) |
| Swagger UI | [/api-docs](https://waretrack-pro.onrender.com/api-docs) |
| OpenAPI JSON | [/api-docs.json](https://waretrack-pro.onrender.com/api-docs.json) |
| Postman | [`WareTrack-Pro-API.postman_collection.json`](./WareTrack-Pro-API.postman_collection.json) |

### Using the Postman collection (v2.2.0)

1. Import the collection into Postman.
2. In the collection variables, set `email` and `password`.
3. Run **Authentication → POST auth/login**. A code is emailed to you.
4. Put the code in `otp` and run **POST auth/verify-login-otp**. The tokens are saved for every other request.

Each request's description says which roles may call it.

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
| Advanced features (customer portal, proof of delivery, forecasting, barcodes, chat) | `/api/features` |

---

## 🛡 Security

- **Two-step sign-in:** password plus a 6-digit email code that expires in 5 minutes and is cancelled after 5 wrong tries.
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
│   │   ├── services/         Email, notifications, queues
│   │   └── server.ts         Entry point
│   └── Dockerfile
├── frontend/                 React app
│   └── src/
│       ├── components/       UI kit, charts, forms, layout
│       ├── pages/            Screens and role dashboards
│       ├── services/         API clients
│       └── utils/            Formatting and PDF/CSV/JSON export
├── render.yaml               Render Blueprint for the API
├── docker-compose.yml        Local stack
└── WareTrack-Pro-API.postman_collection.json
```

---

## 🆕 What's new in 2.2.0

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
