/**
 * Project routes
 *
 * GET    /api/projects            — public  (published projects only, no 'published' field)
 * GET    /api/projects/admin      — admin   (ALL projects, includes published/draft, all fields)
 * POST   /api/projects            — admin   (create project)
 * PUT    /api/projects/:id        — admin   (full update; always send all fields from the form)
 * DELETE /api/projects/:id        — admin   (delete project)
 */
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { csrfProtect } = require('../middleware/csrf');

// ── Shared validators ─────────────────────────────────────────────────────────
// Nullable URL helper: allows null/empty or a valid http(s) URL
function optionalUrl(field) {
  return body(field)
    .optional({ nullable: true })
    .custom(v => {
      if (v === null || v === undefined || v === '') return true;
      try { new URL(v); return true; } catch { throw new Error(`${field} must be a valid URL`); }
    });
}

const projectValidators = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 chars)'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('category').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('technologies').optional({ nullable: true }).isArray(),
  body('technologies.*').optional().trim().isLength({ max: 50 }),
  optionalUrl('image_url'),
  optionalUrl('live_url'),
  optionalUrl('github_url'),
  optionalUrl('case_study_url'),
  body('featured').optional({ nullable: true }).isBoolean(),
  body('sort_order').optional({ nullable: true }).isInt({ min: 0 }),
  body('published').optional({ nullable: true }).isBoolean(),
];

// ── Public: published projects only ──────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, description, category, technologies,
              image_url, live_url, github_url, case_study_url,
              featured, sort_order
       FROM projects
       WHERE published = true
       ORDER BY featured DESC, sort_order ASC, created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Admin: ALL projects (drafts + published), full data ───────────────────────
// NOTE: This route must be declared BEFORE /:id to avoid 'admin' matching the param.
router.get('/admin', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, description, category, technologies,
              image_url, live_url, github_url, case_study_url,
              featured, sort_order, published, created_at, updated_at
       FROM projects
       ORDER BY sort_order ASC, created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Admin: create project ─────────────────────────────────────────────────────
router.post('/', requireAuth, csrfProtect, projectValidators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed.', details: errors.array() });

  const {
    title, description, category, technologies,
    image_url, live_url, github_url, case_study_url,
    featured, sort_order, published,
  } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO projects
         (title, description, category, technologies, image_url, live_url,
          github_url, case_study_url, featured, sort_order, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        title,
        description  || null,
        category     || null,
        technologies || [],
        image_url    || null,
        live_url     || null,
        github_url   || null,
        case_study_url || null,
        featured  !== undefined && featured  !== null ? featured  : false,
        sort_order !== undefined && sort_order !== null ? sort_order : 0,
        published  !== undefined && published  !== null ? published  : true,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ── Admin: update project (full PUT — all fields come from admin form) ─────────
router.put('/:id', requireAuth, csrfProtect,
  param('id').isInt({ min: 1 }),
  ...projectValidators,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed.', details: errors.array() });

    const {
      title, description, category, technologies,
      image_url, live_url, github_url, case_study_url,
      featured, sort_order, published,
    } = req.body;

    // 'published' must always be sent by the admin form so we never accidentally
    // change it. If somehow omitted, fetch the current value rather than
    // defaulting to true (which would accidentally publish a draft).
    let publishedValue = published;
    if (publishedValue === undefined || publishedValue === null) {
      const { rows: cur } = await db.query('SELECT published FROM projects WHERE id=$1', [req.params.id]);
      publishedValue = cur[0]?.published ?? true;
    }

    try {
      const { rows } = await db.query(
        `UPDATE projects
         SET title=$1, description=$2, category=$3, technologies=$4,
             image_url=$5, live_url=$6, github_url=$7, case_study_url=$8,
             featured=$9, sort_order=$10, published=$11
         WHERE id=$12
         RETURNING *`,
        [
          title,
          description    || null,
          category       || null,
          technologies   || [],
          image_url      || null,
          live_url       || null,
          github_url     || null,
          case_study_url || null,
          featured   ? true : false,
          sort_order != null ? sort_order : 0,
          publishedValue,
          req.params.id,
        ]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Project not found.' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

// ── Admin: delete project ─────────────────────────────────────────────────────
router.delete('/:id', requireAuth, csrfProtect,
  param('id').isInt({ min: 1 }),
  async (req, res, next) => {
    if (!validationResult(req).isEmpty()) return res.status(400).json({ error: 'Invalid id.' });
    try {
      const { rowCount } = await db.query('DELETE FROM projects WHERE id=$1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: 'Project not found.' });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
