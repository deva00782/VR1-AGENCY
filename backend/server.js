require('dotenv').config();

// ── Env validation (runs before anything else imports DB or routes) ────────────
const isProd = process.env.NODE_ENV === 'production';

const WEAK_PATTERNS = ['replace-with','changeme','placeholder','jwt_secret','secret','password'];

function validateEnv() {
  const errs = [];
  if (!process.env.DATABASE_URL) errs.push('DATABASE_URL is not set.');
  if (!process.env.JWT_SECRET)   errs.push('JWT_SECRET is not set.');
  if (errs.length) {
    console.error('FATAL — missing required environment variables:\n  ' + errs.join('\n  ') +
      '\n\nCopy .env.example → .env and fill in every value.');
    process.exit(1);
  }
  if (isProd) {
    const s = process.env.JWT_SECRET;
    if (s.length < 32 || WEAK_PATTERNS.some(p => s.toLowerCase().includes(p))) {
      console.error(
        'FATAL — JWT_SECRET is too short or looks like a placeholder.\n' +
        'Generate a secure secret:\n  ' +
        'node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
      process.exit(1);
    }
    if (!process.env.ALLOWED_ORIGIN) {
      console.error('FATAL — ALLOWED_ORIGIN must be set in production (e.g. https://vr1.studio)');
      process.exit(1);
    }
  }
}

validateEnv();

// ── Imports ───────────────────────────────────────────────────────────────────
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');
const { rateLimit } = require('express-rate-limit');

const authRoutes    = require('./routes/auth');
const inquiryRoutes = require('./routes/inquiries');
const projectRoutes = require('./routes/projects');
const teamRoutes    = require('./routes/team');
const blogRoutes    = require('./routes/blog');
const uploadRoutes  = require('./routes/upload');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Proxy trust (Railway, Render, Fly — one trusted reverse proxy layer) ──────
// Required so secure cookies and IP-based rate limits work correctly behind
// the platform's load balancer.
if (isProd) app.set('trust proxy', 1);

// ── CORS — explicit allowlist, never reflects arbitrary origins ───────────────
const allowedOrigins = isProd
  ? [process.env.ALLOWED_ORIGIN].filter(Boolean)
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3101',
      'http://127.0.0.1:3101',
      'http://localhost:3102',
      'http://127.0.0.1:3102',
    ];

app.use(cors({
  origin(origin, cb) {
    // Allow same-origin / server-to-server (no Origin header) + listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(Object.assign(new Error('Not allowed by CORS'), { status: 403 }));
  },
  credentials: true,
}));

// ── Body parsing + cookies ────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// ── Global rate limit ─────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
}));

// ── Security headers — default (public site) ──────────────────────────────────
// Public site has inline scripts (cursor, scroll effects, contact form wiring)
// so unsafe-inline is kept here. Remove it once those scripts are externalised.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'", 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Stricter CSP for /admin (all JS lives in admin.js — no inline scripts) ────
app.use('/admin', helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc:  ["'self'", "'unsafe-inline'"],
    scriptSrcAttr: ["'unsafe-inline'"],
    styleSrc:   ["'self'", "'unsafe-inline'"],
    imgSrc:     ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc:    ["'self'", 'https:'],
  },
}));

// ── Static: public website ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/projects',  projectRoutes);
app.use('/api/team',      teamRoutes);
app.use('/api/blog',      blogRoutes);
app.use('/api/upload',    uploadRoutes);

// ── Admin dashboard (static SPA; auth enforced by /api/auth/me on every load) ─
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));
app.get('/admin/*', (_req, res) => res.sendFile(path.join(__dirname, '../frontend/admin', 'index.html')));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status  = err.status || 500;
  const message = isProd ? 'An unexpected error occurred.' : (err.message || 'Error');
  if (!isProd) console.error(err.stack);
  res.status(status).json({ error: message });
});

app.listen(PORT, () => console.log(`VR1 server → http://localhost:${PORT}`));
