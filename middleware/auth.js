const jwt = require('jsonwebtoken');

/**
 * Middleware: verify JWT from httpOnly cookie.
 * Attaches req.user = { id, email, name } on success.
 * Returns 401 if missing or invalid.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.vr1_token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, name: payload.name };
    next();
  } catch {
    // Do not leak why verification failed
    return res.status(401).json({ error: 'Authentication required.' });
  }
}

module.exports = { requireAuth };
