const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../../db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// ── GET PUBLIC DATA (Aggregated) ───────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const settingsPromise = db.query('SELECT * FROM pricing_settings LIMIT 1');
    const plansPromise = db.query('SELECT * FROM pricing_plans WHERE active = TRUE ORDER BY sort_order ASC');
    const factorsPromise = db.query('SELECT * FROM pricing_factors WHERE active = TRUE ORDER BY sort_order ASC');
    const addonsPromise = db.query('SELECT * FROM pricing_addons WHERE active = TRUE ORDER BY sort_order ASC');
    const maintenancePromise = db.query('SELECT * FROM maintenance_plans WHERE active = TRUE ORDER BY sort_order ASC');
    const faqsPromise = db.query('SELECT * FROM pricing_faqs WHERE active = TRUE ORDER BY sort_order ASC');

    const [settingsRes, plansRes, factorsRes, addonsRes, maintenanceRes, faqsRes] = await Promise.all([
      settingsPromise, plansPromise, factorsPromise, addonsPromise, maintenancePromise, faqsPromise
    ]);

    res.json({
      settings: settingsRes.rows[0] || null,
      plans: plansRes.rows,
      factors: factorsRes.rows,
      addons: addonsRes.rows,
      maintenance: maintenanceRes.rows,
      faqs: faqsRes.rows
    });
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) {
      console.warn('Database connection failed, serving fallback pricing data.');
      return res.json({
        settings: null,
        plans: [
          { name: 'Starter Website', price: '₹12,999', price_suffix: '', description: 'For businesses that need a professional online presence.', features: ['Up to 5 pages', 'Responsive design', 'Home, About, Services & Contact', 'WhatsApp integration', 'Google Maps integration', 'Contact form', 'Social media integration', 'Basic SEO', 'SSL', 'Deployment', '7 days support'], is_popular: false },
          { name: 'Business Website', price: '₹24,999', price_suffix: '', description: 'For growing businesses that need a stronger online presence.', features: ['Up to 10 pages', 'Premium UI/UX', 'Services / Products', 'Testimonials', 'Gallery', 'FAQ', 'Lead enquiry forms', 'WhatsApp integration', 'Click-to-call', 'Google Business integration', 'Advanced SEO', 'Analytics', 'Performance optimization', 'Basic content management', '30 days support'], is_popular: true },
          { name: 'Professional CMS Website', price: '₹39,999', price_suffix: '', description: 'For businesses that want complete control over their website.', features: ['Custom professional UI/UX', 'Secure admin login', 'Admin dashboard', 'Content management system', 'Service / Product management', 'Gallery management', 'Testimonials management', 'Team management', 'Offers / Promotions', 'FAQ management', 'Blog management', 'Enquiry management', 'Image uploads', 'Database', 'SEO management', 'Custom content sections', '60 days support'], is_popular: false },
          { name: 'Custom Website / Web Application', price: 'Starting at ₹59,999', price_suffix: '', description: 'For businesses requiring custom functionality and advanced systems.', features: ['Custom UI/UX', 'Advanced admin dashboard', 'Authentication', 'Customer dashboards', 'Staff dashboards', 'Online booking', 'Payment integration', 'CRM functionality', 'Lead management', 'Automation', 'Third-party APIs', 'Advanced database functionality', 'Custom workflows', 'Analytics', 'Custom integrations'], is_popular: false }
        ],
        factors: [],
        addons: [],
        maintenance: [
          { name: 'Basic Care', price: '₹999', billing_period: '/ month', description: 'For businesses that need basic website maintenance and technical support.', features: ['Website health checks', 'Basic security checks', 'Minor content updates', 'Text/content corrections', 'Basic image replacements', 'Technical support', 'Backup checks', 'Monthly maintenance review'], is_popular: false, cta_text: 'Choose Basic Care', cta_link: '/contact.html' },
          { name: 'Business Care', price: '₹1,999', billing_period: '/ month', description: 'For growing businesses that want regular updates and reliable website support.', features: ['Everything in Basic Care', 'Regular website updates', 'Multiple content changes', 'Image and gallery updates', 'Service / product updates', 'Basic performance monitoring', 'Security monitoring', 'Backup management', 'Minor layout adjustments', 'Priority support'], is_popular: true, cta_text: 'Choose Business Care', cta_link: '/contact.html' },
          { name: 'Premium Care', price: '₹3,999', billing_period: '/ month', description: 'For businesses that need priority support and ongoing website improvements.', features: ['Everything in Business Care', 'Priority technical support', 'Frequent content updates', 'Advanced website monitoring', 'Performance optimization', 'Security monitoring', 'Backup management', 'Minor feature improvements', 'Landing page/content updates', 'Monthly website review', 'Priority maintenance requests'], is_popular: false, cta_text: 'Choose Premium Care', cta_link: '/contact.html' }
        ],
        faqs: []
      });
    }
    next(err);
  }
});

// ── GET ADMIN DATA (All Data, Including Inactive) ──────────────────────────
router.get('/admin', requireAuth, async (req, res, next) => {
  try {
    const settingsPromise = db.query('SELECT * FROM pricing_settings LIMIT 1');
    const plansPromise = db.query('SELECT * FROM pricing_plans ORDER BY sort_order ASC');
    const factorsPromise = db.query('SELECT * FROM pricing_factors ORDER BY sort_order ASC');
    const addonsPromise = db.query('SELECT * FROM pricing_addons ORDER BY sort_order ASC');
    const maintenancePromise = db.query('SELECT * FROM maintenance_plans ORDER BY sort_order ASC');
    const faqsPromise = db.query('SELECT * FROM pricing_faqs ORDER BY sort_order ASC');

    const [settingsRes, plansRes, factorsRes, addonsRes, maintenanceRes, faqsRes] = await Promise.all([
      settingsPromise, plansPromise, factorsPromise, addonsPromise, maintenancePromise, faqsPromise
    ]);

    res.json({
      settings: settingsRes.rows[0] || null,
      plans: plansRes.rows,
      factors: factorsRes.rows,
      addons: addonsRes.rows,
      maintenance: maintenanceRes.rows,
      faqs: faqsRes.rows
    });
  } catch (err) {
    next(err);
  }
});

// ── SETTINGS CRUD ─────────────────────────────────────────────────────────
router.put('/settings', requireAuth, [
  body('hero_title').optional().isString().trim(),
  body('hero_subtitle').optional().isString().trim(),
  body('cta_text').optional().isString().trim(),
  body('cta_link').optional().isString().trim(),
  body('bottom_cta_title').optional().isString().trim(),
  body('bottom_cta_text').optional().isString().trim(),
  body('bottom_cta_link').optional().isString().trim(),
  validate
], async (req, res, next) => {
  try {
    const { hero_title, hero_subtitle, cta_text, cta_link, bottom_cta_title, bottom_cta_text, bottom_cta_link } = req.body;
    const existing = await db.query('SELECT id FROM pricing_settings LIMIT 1');
    
    if (existing.rows.length > 0) {
      await db.query(`
        UPDATE pricing_settings SET 
          hero_title = COALESCE($1, hero_title),
          hero_subtitle = COALESCE($2, hero_subtitle),
          cta_text = COALESCE($3, cta_text),
          cta_link = COALESCE($4, cta_link),
          bottom_cta_title = COALESCE($5, bottom_cta_title),
          bottom_cta_text = COALESCE($6, bottom_cta_text),
          bottom_cta_link = COALESCE($7, bottom_cta_link)
        WHERE id = $8
      `, [hero_title, hero_subtitle, cta_text, cta_link, bottom_cta_title, bottom_cta_text, bottom_cta_link, existing.rows[0].id]);
    } else {
      await db.query(`
        INSERT INTO pricing_settings (hero_title, hero_subtitle, cta_text, cta_link, bottom_cta_title, bottom_cta_text, bottom_cta_link)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [hero_title, hero_subtitle, cta_text, cta_link, bottom_cta_title, bottom_cta_text, bottom_cta_link]);
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    next(err);
  }
});

// ── PLANS CRUD ────────────────────────────────────────────────────────────
router.post('/plans', requireAuth, [
  body('name').notEmpty().trim(),
  body('price').notEmpty().trim(),
  body('price_suffix').optional({ nullable: true }).trim(),
  body('description').optional({ nullable: true }).trim(),
  body('features').optional({ nullable: true }).isArray(),
  body('is_popular').optional().isBoolean(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { name, price, price_suffix, description, features, is_popular = false, sort_order = 0, active = true } = req.body;
    const result = await db.query(`
      INSERT INTO pricing_plans (name, price, price_suffix, description, features, is_popular, sort_order, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [name, price, price_suffix, description, features || [], is_popular, sort_order, active]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/plans/:id', requireAuth, [
  body('name').notEmpty().trim(),
  body('price').notEmpty().trim(),
  body('price_suffix').optional({ nullable: true }).trim(),
  body('description').optional({ nullable: true }).trim(),
  body('features').optional({ nullable: true }).isArray(),
  body('is_popular').optional().isBoolean(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { name, price, price_suffix, description, features, is_popular, sort_order, active } = req.body;
    const result = await db.query(`
      UPDATE pricing_plans 
      SET name = $1, price = $2, price_suffix = $3, description = $4, features = $5, is_popular = $6, sort_order = $7, active = $8
      WHERE id = $9 RETURNING *
    `, [name, price, price_suffix, description, features || [], is_popular, sort_order, active, req.params.id]);
    
    if (result.rowCount === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/plans/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM pricing_plans WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ── FACTORS CRUD ──────────────────────────────────────────────────────────
router.post('/factors', requireAuth, [
  body('title').notEmpty().trim(),
  body('description').optional({ nullable: true }).trim(),
  body('icon').optional({ nullable: true }).trim(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { title, description, icon, sort_order = 0, active = true } = req.body;
    const result = await db.query(`
      INSERT INTO pricing_factors (title, description, icon, sort_order, active)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [title, description, icon, sort_order, active]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/factors/:id', requireAuth, [
  body('title').notEmpty().trim(),
  body('description').optional({ nullable: true }).trim(),
  body('icon').optional({ nullable: true }).trim(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { title, description, icon, sort_order, active } = req.body;
    const result = await db.query(`
      UPDATE pricing_factors 
      SET title = $1, description = $2, icon = $3, sort_order = $4, active = $5
      WHERE id = $6 RETURNING *
    `, [title, description, icon, sort_order, active, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Factor not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/factors/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM pricing_factors WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Factor not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ── ADDONS CRUD ───────────────────────────────────────────────────────────
router.post('/addons', requireAuth, [
  body('name').notEmpty().trim(),
  body('price').notEmpty().trim(),
  body('description').optional({ nullable: true }).trim(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { name, price, description, sort_order = 0, active = true } = req.body;
    const result = await db.query(`
      INSERT INTO pricing_addons (name, price, description, sort_order, active)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [name, price, description, sort_order, active]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/addons/:id', requireAuth, [
  body('name').notEmpty().trim(),
  body('price').notEmpty().trim(),
  body('description').optional({ nullable: true }).trim(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { name, price, description, sort_order, active } = req.body;
    const result = await db.query(`
      UPDATE pricing_addons 
      SET name = $1, price = $2, description = $3, sort_order = $4, active = $5
      WHERE id = $6 RETURNING *
    `, [name, price, description, sort_order, active, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Addon not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/addons/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM pricing_addons WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Addon not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ── MAINTENANCE PLANS CRUD ────────────────────────────────────────────────
router.post('/maintenance', requireAuth, [
  body('name').notEmpty().trim(),
  body('price').notEmpty().trim(),
  body('billing_period').optional({ nullable: true }).trim(),
  body('description').optional({ nullable: true }).trim(),
  body('features').optional({ nullable: true }).isArray(),
  body('is_popular').optional().isBoolean(),
  body('cta_text').optional({ nullable: true }).trim(),
  body('cta_link').optional({ nullable: true }).trim(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { name, price, billing_period, description, features, is_popular = false, cta_text = null, cta_link = null, sort_order = 0, active = true } = req.body;
    const result = await db.query(`
      INSERT INTO maintenance_plans (name, price, billing_period, description, features, is_popular, cta_text, cta_link, sort_order, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `, [name, price, billing_period, description, features || [], is_popular, cta_text, cta_link, sort_order, active]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/maintenance/:id', requireAuth, [
  body('name').notEmpty().trim(),
  body('price').notEmpty().trim(),
  body('billing_period').optional({ nullable: true }).trim(),
  body('description').optional({ nullable: true }).trim(),
  body('features').optional({ nullable: true }).isArray(),
  body('is_popular').optional().isBoolean(),
  body('cta_text').optional({ nullable: true }).trim(),
  body('cta_link').optional({ nullable: true }).trim(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { name, price, billing_period, description, features, is_popular, cta_text, cta_link, sort_order, active } = req.body;
    const result = await db.query(`
      UPDATE maintenance_plans 
      SET name = $1, price = $2, billing_period = $3, description = $4, features = $5, is_popular = $6, cta_text = $7, cta_link = $8, sort_order = $9, active = $10
      WHERE id = $11 RETURNING *
    `, [name, price, billing_period, description, features || [], is_popular, cta_text, cta_link, sort_order, active, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/maintenance/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM maintenance_plans WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ── FAQS CRUD ─────────────────────────────────────────────────────────────
router.post('/faqs', requireAuth, [
  body('question').notEmpty().trim(),
  body('answer').notEmpty().trim(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { question, answer, sort_order = 0, active = true } = req.body;
    const result = await db.query(`
      INSERT INTO pricing_faqs (question, answer, sort_order, active)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [question, answer, sort_order, active]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/faqs/:id', requireAuth, [
  body('question').notEmpty().trim(),
  body('answer').notEmpty().trim(),
  body('sort_order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { question, answer, sort_order, active } = req.body;
    const result = await db.query(`
      UPDATE pricing_faqs 
      SET question = $1, answer = $2, sort_order = $3, active = $4
      WHERE id = $5 RETURNING *
    `, [question, answer, sort_order, active, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'FAQ not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/faqs/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM pricing_faqs WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'FAQ not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
