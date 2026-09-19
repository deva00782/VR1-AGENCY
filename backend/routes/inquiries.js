/**
 * Inquiry routes
 * POST  /api/inquiries     — public  (contact form submission)
 * GET   /api/inquiries     — admin   (list all)
 * GET   /api/inquiries/:id — admin   (single inquiry)
 * PATCH /api/inquiries/:id — admin   (update status / notes)
 */
const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const db = require('../../db');
const { requireAuth } = require('../../middleware/auth');
const { csrfProtect } = require('../../middleware/csrf');
const notionSync = require('../utils/notionSync');

const VALID_STATUSES = ['NEW','CONTACTED','DISCUSSION','PROPOSAL','ACTIVE','COMPLETED'];

// 5 submissions per hour per IP (public endpoint)
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please try again later.' },
});

/** POST /api/inquiries — public */
router.post('/',
  inquiryLimiter,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('business').optional().trim().isLength({ max: 200 }),
  body('project_type').optional().trim().isLength({ max: 100 }),
  body('budget').optional().trim().isLength({ max: 100 }),
  body('message').trim().isLength({ min: 10, max: 2000 }),
  body('website_url').optional().trim(), // Honeypot field
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Please check your submission and try again.', details: errors.array() });
    }
    const { name, email, business, project_type, budget, message, website_url } = req.body;
    
    // Honeypot trap: if filled, silently reject it to fool the bot
    if (website_url && website_url.length > 0) {
      return res.status(200).json({ ok: true, id: 'spam-blocked' });
    }

    try {
      const { rows } = await db.query(
        `INSERT INTO inquiries (name, email, business, project_type, budget, message)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, created_at`,
        [name, email, business || null, project_type || null, budget || null, message]
      );
      const inquiry = rows[0];

      // Optional Notion sync — fires after response, never blocks the user
      notionSync.syncInquiry({ ...inquiry, business, project_type, budget, message }).catch(
        err => console.error('[notionSync] Failed (non-fatal):', err.message)
      );

      res.status(201).json({ ok: true, id: inquiry.id });
    } catch (err) {
      next(err);
    }
  }
);

/** GET /api/inquiries — admin */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, business, project_type, budget, status, created_at, updated_at
       FROM inquiries ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/** GET /api/inquiries/:id — admin */
router.get('/:id',
  requireAuth,
  param('id').isInt({ min: 1 }),
  async (req, res, next) => {
    if (!validationResult(req).isEmpty()) return res.status(400).json({ error: 'Invalid id.' });
    try {
      const { rows } = await db.query(
        `SELECT id, name, email, business, project_type, budget, message, notes, status, created_at, updated_at
         FROM inquiries WHERE id = $1`, [req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Inquiry not found.' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

/** PATCH /api/inquiries/:id — admin */
router.patch('/:id',
  requireAuth,
  csrfProtect,
  param('id').isInt({ min: 1 }),
  body('status').optional().isIn(VALID_STATUSES),
  body('notes').optional().trim().isLength({ max: 5000 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input.', details: errors.array() });

    const fields = [];
    const values = [];
    let i = 1;
    if (req.body.status !== undefined) { fields.push(`status=$${i++}`); values.push(req.body.status); }
    if (req.body.notes  !== undefined) { fields.push(`notes=$${i++}`);  values.push(req.body.notes); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update.' });

    values.push(req.params.id);
    try {
      const { rows } = await db.query(
        `UPDATE inquiries SET ${fields.join(',')} WHERE id=$${i} RETURNING *`,
        values
      );
      if (!rows[0]) return res.status(404).json({ error: 'Inquiry not found.' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

module.exports = router;
