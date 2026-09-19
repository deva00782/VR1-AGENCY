/**
 * Blog / Studio Updates routes
 *
 * GET    /api/blog           — public (published updates)
 * GET    /api/blog/admin     — admin  (all updates, including drafts)
 * GET    /api/blog/:slug     — public (single update by slug)
 * POST   /api/blog           — admin  (create update)
 * PUT    /api/blog/:id       — admin  (update post)
 * DELETE /api/blog/:id       — admin  (delete post)
 */
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../../db');
const { requireAuth } = require('../../middleware/auth');
const { csrfProtect } = require('../../middleware/csrf');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function optionalUrl(field) {
  return body(field)
    .optional({ nullable: true })
    .custom(v => {
      if (v === null || v === undefined || v === '') return true;
      if (typeof v === 'string' && v.startsWith('/')) return true;
      try { new URL(v); return true; } catch { throw new Error(`${field} must be a valid URL`); }
    });
}

const blogValidators = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 chars)'),
  body('slug').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('excerpt').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('content').optional({ nullable: true }).trim(),
  optionalUrl('cover_url'),
  body('published').optional({ nullable: true }).isBoolean(),
];

/** GET /api/blog — public: published updates only */
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, slug, excerpt, content, cover_url, published_at, created_at
       FROM blog_posts
       WHERE published = true
       ORDER BY published_at DESC, created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/** GET /api/blog/admin — admin: all updates (drafts + published) */
router.get('/admin', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, slug, excerpt, content, cover_url, published, published_at, created_at, updated_at
       FROM blog_posts
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/** GET /api/blog/:slug — public: single post by slug */
router.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, slug, excerpt, content, cover_url, published_at, created_at
       FROM blog_posts
       WHERE slug = $1 AND published = true`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Update not found.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/** POST /api/blog — admin: create update */
router.post('/', requireAuth, csrfProtect, blogValidators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed.', details: errors.array() });

  const { title, excerpt, content, cover_url, published } = req.body;
  let slug = req.body.slug ? slugify(req.body.slug) : slugify(title);
  if (!slug) slug = 'update-' + Date.now();

  try {
    const { rows } = await db.query(
      `INSERT INTO blog_posts (title, slug, excerpt, content, cover_url, published, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        title,
        slug,
        excerpt || null,
        content || null,
        cover_url || null,
        published !== undefined && published !== null ? published : true,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An update with this URL slug already exists. Please adjust the title or slug.' });
    }
    next(err);
  }
});

/** PUT /api/blog/:id — admin: update post */
router.put('/:id', requireAuth, csrfProtect,
  param('id').isInt({ min: 1 }),
  ...blogValidators,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed.', details: errors.array() });

    const { title, excerpt, content, cover_url, published } = req.body;
    let slug = req.body.slug ? slugify(req.body.slug) : slugify(title);
    if (!slug) slug = 'update-' + req.params.id;

    try {
      const { rows } = await db.query(
        `UPDATE blog_posts
         SET title = $1, slug = $2, excerpt = $3, content = $4, cover_url = $5, published = $6
         WHERE id = $7
         RETURNING *`,
        [
          title,
          slug,
          excerpt || null,
          content || null,
          cover_url || null,
          published !== undefined && published !== null ? published : true,
          req.params.id,
        ]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Update not found.' });
      res.json(rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'An update with this URL slug already exists.' });
      }
      next(err);
    }
  }
);

/** DELETE /api/blog/:id — admin: delete post */
router.delete('/:id', requireAuth, csrfProtect,
  param('id').isInt({ min: 1 }),
  async (req, res, next) => {
    if (!validationResult(req).isEmpty()) return res.status(400).json({ error: 'Invalid id.' });
    try {
      const { rowCount } = await db.query('DELETE FROM blog_posts WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: 'Update not found.' });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
