# VR1 Backend
WE ARE ONE ,   AGENCY 
Node.js + Express backend for VR1 Digital Studio. Serves the public website, an admin dashboard, and a JSON API backed by PostgreSQL.

## Requirements

- **Node.js ≥ 18** (built-in `fetch` is used by the optional Notion sync feature)
- **PostgreSQL 14+**

---

## Directory structure

```
vr1-backend/
├── server.js               Express entry point, env validation, middleware
├── .env.example            Copy → .env and fill in every value
├── .gitignore
├── package.json
├── README.md
├── public/                 ← VR1 public website (index.html + assets)
│   └── index.html            Served at /; contact form wired to /api/inquiries
├── admin/
│   ├── index.html            Admin dashboard (dark theme, VR1 style)
│   └── admin.js              All admin JavaScript (no inline scripts)
├── db/
│   ├── index.js              pg connection pool (reads DATABASE_URL)
│   ├── schema.sql            Run once to create tables and triggers
│   └── seed.js               Creates admin user + placeholder data (idempotent)
├── middleware/
│   ├── auth.js               JWT cookie verification (requireAuth)
│   └── csrf.js               CSRF double-submit cookie (csrfProtect)
├── routes/
│   ├── auth.js               POST /api/auth/login|logout, GET /api/auth/me
│   ├── inquiries.js          Contact form + admin inquiry management
│   ├── projects.js           Portfolio project CRUD + /api/projects/admin
│   ├── team.js               Team profile management (PATCH)
│   └── blog.js               Stub — blog posts coming in v2
└── utils/
    └── notionSync.js         Optional Notion sync (disabled if env vars blank)
```

---

## Local setup

### 1. Clone and install

```bash
git clone <your-repo>
cd vr1-backend
npm install
```

### 2. Create `.env`

```bash
cp .env.example .env
```

Edit `.env` and fill in **every** value (see § Environment variables below).

### 3. Create the database

Using `psql` with your connection string:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Or split into two steps:

```bash
psql postgresql://user:pass@localhost:5432/vr1 -f db/schema.sql
```

### 4. Seed the first admin account

```bash
npm run setup
# equivalent to: node db/seed.js
```

This reads `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` from `.env`, hashes the password with bcrypt (cost 12), and upserts the admin user. The seed is **idempotent** — re-running it never duplicates team members or projects.

### 5. Add the public website

The `public/` directory is already populated with the VR1 website (`index.html`). If you need to update it, replace `public/index.html` (do not touch any other server files).

### 6. Run the server

```bash
# Development (auto-restarts on file change — Node 18+ built-in watch)
npm run dev

# Production
npm start
```

Visit:
- `http://localhost:3000` — public website
- `http://localhost:3000/admin` — admin dashboard (shows login screen; auth required for all data)

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port to listen on (default: 3000) |
| `NODE_ENV` | No | Set to `production` to enable strict mode |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | ≥ 32-char random string. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ADMIN_EMAIL` | Seed only | Email for the first admin account |
| `ADMIN_PASSWORD` | Seed only | Password (≥ 12 chars, no common words). Never stored in plain text |
| `ADMIN_NAME` | No | Display name (default: `VR1 Admin`) |
| `ALLOWED_ORIGIN` | Prod only | Full origin URL, e.g. `https://vr1.studio` |
| `NOTION_TOKEN` | No | Optional Notion integration token (v2 feature) |
| `NOTION_INQUIRIES_DB_ID` | No | Optional Notion database ID for inquiry sync |

In **production**, the server exits at startup if `DATABASE_URL`, `JWT_SECRET`, or `ALLOWED_ORIGIN` are missing or weak.

---

## Database schema

All tables are in `db/schema.sql`. Key tables:

| Table | Purpose |
|---|---|
| `users` | Admin accounts (bcrypt hashed passwords) |
| `inquiries` | Contact form submissions with status workflow |
| `projects` | Portfolio projects (`published` flag controls public visibility) |
| `team` | Team member profiles with URL fields |

Auto-updating `updated_at` triggers are set on `inquiries`, `projects`, and `team`.

---

## API reference

### Public endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | Published projects only (no `published` field) |
| `GET` | `/api/team` | All team members |
| `POST` | `/api/inquiries` | Submit contact form (5 req/hr rate limit) |
| `GET` | `/api/blog` | Stub — returns empty list |

### Authenticated endpoints

All require a valid `vr1_token` httpOnly cookie (set on login). State-changing requests also require an `X-CSRF-Token` header matching the `vr1_csrf` cookie.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Log in; sets JWT + CSRF cookies |
| `POST` | `/api/auth/logout` | Clear cookies |
| `GET` | `/api/auth/me` | Verify session |
| `GET` | `/api/projects/admin` | **All** projects incl. drafts + `published` field |
| `POST` | `/api/projects` | Create project |
| `PUT` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project |
| `PATCH` | `/api/team/:id` | Partial update team member (only sent fields change) |
| `GET` | `/api/inquiries` | List all inquiries |
| `GET` | `/api/inquiries/:id` | Single inquiry |
| `PATCH` | `/api/inquiries/:id` | Update status and/or notes |

---

## Security features

| Feature | Detail |
|---|---|
| JWT | `httpOnly`, `Secure` (prod), `SameSite=Lax` cookie, 8h expiry |
| CSRF | Double-submit cookie pattern (`vr1_csrf` + `X-CSRF-Token` header) |
| Timing attack prevention | `bcrypt.compare` always runs; login errors are generic |
| Helmet | CSP, HSTS, X-Frame-Options, etc. |
| Stricter admin CSP | `/admin` served with `scriptSrc: ["'self'"]` (no `unsafe-inline`) |
| CORS | Explicit allowlist; never reflects the request `Origin` |
| Rate limits | 200 req/15min global; 10 login/15min; 5 inquiries/hr |
| Proxy trust | `trust proxy: 1` in production for Railway/Render/Fly |
| Parameterized SQL | All queries use `$1` parameters; no string interpolation |
| No hash exposure | `password_hash` is never returned in API responses |

---

## Deploying to Railway, Render, or Fly.io

### Railway (recommended)

1. Push this folder to a GitHub repo.
2. Create a new Railway project and connect the repo.
3. Add a **PostgreSQL** service in Railway.
4. Set all environment variables in the Railway dashboard.
5. Open the Railway shell and run:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # copy as JWT_SECRET
   psql $DATABASE_URL -f db/schema.sql
   npm run setup
   ```
6. Set `NODE_ENV=production` and `ALLOWED_ORIGIN=https://yourdomain.com`.

### Render

Same process — Render provides a PostgreSQL add-on and a Shell tab on every service.

### Fly.io

```bash
fly launch
fly postgres create
fly postgres attach <db-name>
fly ssh console -C "psql $DATABASE_URL -f db/schema.sql"
fly ssh console -C "npm run setup"
```

---

## Why JavaScript seed (not SQL)?

`db/seed.js` uses JavaScript because:
- bcrypt password hashing cannot be done in plain SQL.
- Storing a plain-text password in a `.sql` file is exactly what we want to avoid.
- The seed reads credentials from `.env` at runtime and hashes them before inserting.

The seed is idempotent: admin user uses `ON CONFLICT (email) DO UPDATE`; team and project placeholders are skipped if those tables already contain rows.

---

## v2 Roadmap

- [ ] Notion sync (set `NOTION_TOKEN` + `NOTION_INQUIRIES_DB_ID` in `.env`)
- [ ] Image/file storage via Cloudinary or Supabase Storage
- [ ] Blog / case studies (see `routes/blog.js` stub)
- [ ] Email notifications on new inquiry (Resend / SendGrid)
- [ ] Client portal accounts
