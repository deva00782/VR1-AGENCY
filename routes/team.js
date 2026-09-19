/**
 * Team routes
 *
 * GET   /api/team     — public  (all members, display on website)
 * PATCH /api/team/:id — admin   (partial update; only sent fields are changed)
 *
 * PATCH semantics:
 *   - Fields present in the request body are updated (including explicit null to clear).
 *   - Fields absent from the request body are left unchanged in the database.
 *   - This prevents the common bug where omitting a field silently erases its value.
 */
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { csrfProtect } = require('../middleware/csrf');

// Fields the PATCH handler will consider (in a fixed order for readability)
const UPDATABLE_FIELDS = [
  'name', 'role', 'bio', 'skills',
  'github_url', 'resume_url', 'linkedin_url',
  'twitter_url', 'portfolio_url', 'photo_url',
  'member_order',
];

// Nullable URL validator: accepts null/empty string or a valid http(s) URL
function optionalNullableUrl(field) {
  return body(field)
    .optional({ nullable: true })
    .custom(v => {
      if (v === null || v === undefined || v === '') return true;
      try { new URL(v); return true; } catch { throw new Error(`${field} must be a valid URL`); }
    });
}

const teamValidators = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  // role is a plain text input, NOT a category dropdown
  body('role').optional().trim().isLength({ max: 100 }),
  body('bio').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('skills').optional({ nullable: true }).isArray(),
  body('skills.*').optional().trim().isLength({ max: 60 }),
  body('member_order').optional({ nullable: true }).isInt({ min: 0 }),
  optionalNullableUrl('github_url'),
  optionalNullableUrl('resume_url'),
  optionalNullableUrl('linkedin_url'),
  optionalNullableUrl('twitter_url'),
  optionalNullableUrl('portfolio_url'),
  optionalNullableUrl('photo_url'),
];

/** GET /api/team — public */
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, role, bio, skills,
              github_url, resume_url, linkedin_url,
              twitter_url, portfolio_url, photo_url,
              member_order
       FROM team
       ORDER BY member_order ASC, id ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/** PATCH /api/team/:id — admin: partial update */
router.patch('/:id',
  requireAuth,
  csrfProtect,
  param('id').isInt({ min: 1 }),
  ...teamValidators,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed.', details: errors.array() });

    // Build dynamic SET clause — only touch fields the client actually sent.
    // Explicit null → cleared. Absent field → untouched.
    const fields = [];
    const values = [];
    let i = 1;

    for (const key of UPDATABLE_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(req.body, key)) continue;
      fields.push(`"${key}"=$${i++}`);
      const val = req.body[key];
      // Coerce empty string to null for optional fields (except name/role which must be non-empty)
      if (key !== 'name' && key !== 'role' && val === '') {
        values.push(null);
      } else {
        values.push(val !== undefined ? val : null);
      }
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No valid fields to update. Send at least one field.' });
    }

    values.push(req.params.id);

    try {
      const { rows } = await db.query(
        `UPDATE team
         SET ${fields.join(', ')}
         WHERE id = $${i}
         RETURNING id, name, role, bio, skills,
                   github_url, resume_url, linkedin_url,
                   twitter_url, portfolio_url, photo_url,
                   member_order`,
        values
      );
      if (!rows[0]) return res.status(404).json({ error: 'Team member not found.' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

/** POST /api/team — admin: create team member */
router.post('/', requireAuth, csrfProtect,
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('role').trim().isLength({ min: 1, max: 100 }).withMessage('Role is required'),
    ...teamValidators,
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed.', details: errors.array() });

    const {
      name, role, bio, skills,
      github_url, resume_url, linkedin_url,
      twitter_url, portfolio_url, photo_url,
      member_order,
    } = req.body;

    try {
      const { rows } = await db.query(
        `INSERT INTO team
           (name, role, bio, skills, github_url, resume_url, linkedin_url, twitter_url, portfolio_url, photo_url, member_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          name,
          role,
          bio || null,
          skills || [],
          github_url || null,
          resume_url || null,
          linkedin_url || null,
          twitter_url || null,
          portfolio_url || null,
          photo_url || null,
          member_order !== undefined && member_order !== null ? member_order : 0,
        ]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

/** DELETE /api/team/:id — admin: delete team member */
router.delete('/:id', requireAuth, csrfProtect,
  param('id').isInt({ min: 1 }),
  async (req, res, next) => {
    if (!validationResult(req).isEmpty()) return res.status(400).json({ error: 'Invalid id.' });
    try {
      const { rowCount } = await db.query('DELETE FROM team WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: 'Team member not found.' });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;

