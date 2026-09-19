const crypto = require('crypto');

/**
 * CSRF protection using the double-submit cookie pattern.
 *
 * Flow:
 *  1. On login, server sets a random `vr1_csrf` cookie (NOT httpOnly — JS must read it).
 *  2. Client reads `vr1_csrf` and sends it as the `X-CSRF-Token` request header.
 *  3. This middleware checks that both values match on state-changing routes.
 *
 * Apply to: all authenticated POST / PUT / PATCH / DELETE API routes.
 * Do NOT apply to GET / HEAD / OPTIONS (safe methods).
 */
function csrfProtect(req, res, next) {
  const safe = ['GET', 'HEAD', 'OPTIONS'];
  if (safe.includes(req.method)) return next();

  const cookieToken  = req.cookies?.vr1_csrf;
  const headerToken  = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF token missing.' });
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ error: 'CSRF token invalid.' });
  }

  next();
}

/** Generate a cryptographically random CSRF token */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Constant-time string comparison */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = { csrfProtect, generateCsrfToken };
