/**
 * Auth routes
 * POST /api/auth/login   — public
 * POST /api/auth/logout  — public
 * GET  /api/auth/me      — protected (verify session)
 */
const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db      = require('../../db');
const { requireAuth }      = require('../../middleware/auth');
const { generateCsrfToken } = require('../../middleware/csrf');

const isProd = process.env.NODE_ENV === 'production';

// Strict rate limit on login: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: false,
});

const cookieOptions = {
  httpOnly: true,
  secure:   isProd,           // HTTPS only in production
  sameSite: 'Lax',
  maxAge:   8 * 60 * 60 * 1000, // 8 hours
};

/** POST /api/auth/login */
router.post('/login',
  ...(isProd ? [loginLimiter] : []),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 200 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    // Return same generic message whether email is wrong OR password is wrong
    // (don't reveal which field failed — prevents user enumeration)
    const GENERIC_ERROR = { error: 'Invalid credentials.' };

    if (!errors.isEmpty()) return res.status(401).json(GENERIC_ERROR);

    const { email, password } = req.body;
    try {
      const { rows } = await db.query(
        'SELECT id, email, name, password_hash FROM users WHERE email = $1',
        [email]
      );
      const user = rows[0];

      // Always run bcrypt.compare even if user not found
      // (prevents timing attack that reveals whether email exists)
      const dummyHash = '$2b$12$invalidhashfortimingprotectiononly000000000000000000000';
      const match = await bcrypt.compare(password, user?.password_hash || dummyHash);

      if (!user || !match) return res.status(401).json(GENERIC_ERROR);

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      const csrfToken = generateCsrfToken();

      res
        .cookie('vr1_token', token, cookieOptions)
        // CSRF cookie: NOT httpOnly so JS can read it
        .cookie('vr1_csrf', csrfToken, {
          httpOnly: false,
          secure:   isProd,
          sameSite: 'Lax',
          maxAge:   8 * 60 * 60 * 1000,
        })
        .json({ name: user.name, email: user.email });
    } catch (err) {
      next(err);
    }
  }
);

/** POST /api/auth/logout */
router.post('/logout', (req, res) => {
  res
    .clearCookie('vr1_token', { httpOnly: true, sameSite: 'Lax', secure: isProd })
    .clearCookie('vr1_csrf',  { sameSite: 'Lax', secure: isProd })
    .json({ ok: true });
});

/** GET /api/auth/me — used by admin dashboard to verify session on load */
router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, name: req.user.name });
});

module.exports = router;
