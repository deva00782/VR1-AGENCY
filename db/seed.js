/**
 * VR1 — Database seed script
 * ============================================================
 * Run ONCE after schema.sql:  node db/seed.js
 * (or via npm script):         npm run setup
 *
 * What this does:
 *   1. Creates / updates the admin user from ADMIN_EMAIL + ADMIN_PASSWORD in .env.
 *      Uses INSERT … ON CONFLICT (email) DO UPDATE, so it's safe to re-run.
 *   2. Inserts placeholder team members and projects ONLY if those tables are
 *      currently empty, making re-runs completely idempotent.
 *
 * Why JavaScript (not SQL)?
 *   Passwords must be hashed with bcrypt before storage. SQL cannot do this.
 *   A pure-SQL seed would require storing a plain-text password in a .sql file,
 *   which is exactly what we're trying to avoid.
 *
 * ADMIN_NAME is optional — defaults to 'VR1 Admin'.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const db     = require('./index');

async function seed() {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name     = process.env.ADMIN_NAME || 'VR1 Admin';

  // ── Validate credentials ────────────────────────────────────────────────────
  if (!email || !password) {
    console.error(
      'ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must both be set in .env.\n' +
      'Copy .env.example → .env and fill in your values before running seed.'
    );
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('ERROR: ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }
  const weak = ['password','changeme','123456','admin','qwerty'];
  if (weak.some(w => password.toLowerCase().includes(w))) {
    console.error('ERROR: ADMIN_PASSWORD appears too weak. Use a randomly generated password.');
    process.exit(1);
  }

  // ── Admin user — upsert (idempotent) ────────────────────────────────────────
  const hash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = $2, password_hash = $3`,
    [email, name, hash]
  );
  console.log(`✓ Admin user ready: ${email}`);

  // ── Team placeholders — only if team table is empty ─────────────────────────
  const { rows: [{ count: teamCount }] } = await db.query('SELECT COUNT(*) AS count FROM team');
  if (parseInt(teamCount, 10) === 0) {
    await db.query(`
      INSERT INTO team (name, role, bio, skills, github_url, linkedin_url, resume_url, portfolio_url, member_order) VALUES
        ('Sai Deva Harrsha', 'Co-Founder & Full-Stack Engineer',
         'I’m a software engineer and Co-Founder of VR1, focused on building reliable web applications, backend systems, and interactive digital experiences. Through six months of internship experience and personal projects, I’ve worked across Java, Python, JavaScript, Spring Boot, Node.js, SQL databases, and AI/ML-related technologies. I enjoy turning complex ideas into practical, scalable products.',
         ARRAY['Java','Python','JavaScript','C','HTML','CSS','SQL','Spring Boot','Node.js','Express.js','REST APIs','PostgreSQL','MySQL','Database Design','AI/ML','Three.js','WebGL','GSAP','Git','GitHub','Backend Architecture','Responsive Web Development'],
         'https://github.com/deva00782',
         'https://www.linkedin.com/in/sai-devaharrsha-028517326',
         'https://canva.link/pz6uxgtho53atbz',
         NULL,
         1),
        ('E Ankit Kumar Singh', 'Founder & Full Stack Developer',
         'Self-taught full-stack developer passionate about building clean, performant web applications. Currently doing an internship at LLC SUCCED INTERNATIONAL LIVE PROJECT and expanding into AI/ML, with a focus on thoughtful architecture and solving real problems through code.',
         ARRAY['JavaScript','React.js','Node.js','Express.js','MongoDB','HTML','CSS','Java','Python','AI/ML','Git'],
         'https://github.com/ankitanmol26',
         'https://www.linkedin.com/in/ankit-kumar-singh-026b16326/',
         'https://docs.google.com/document/d/1IPhbeZl6hBKN9gtF20BgD0KPjbNHPrZ7/edit?usp=drive_link&ouid=104565927008434950691&rtpof=true&sd=true',
         'https://ankit-protfolio-sandy.vercel.app',
         2)
    `);
    console.log('✓ Team placeholders seeded (2 members).');
  } else {
    console.log(`  Team table already has ${teamCount} row(s) — skipping placeholder seed.`);
  }

  // ── Project placeholder — only if projects table is empty ───────────────────
  const { rows: [{ count: projCount }] } = await db.query('SELECT COUNT(*) AS count FROM projects');
  if (parseInt(projCount, 10) === 0) {
    await db.query(`
      INSERT INTO projects (title, description, category, technologies, featured, sort_order, published)
      VALUES (
        '[PROJECT 1 NAME]',
        'Replace with a real project description from the VR1 admin dashboard.',
        'Web Development',
        ARRAY['HTML','CSS','JavaScript'],
        true, 1, false
      )
    `);
    // Draft (published=false) so placeholder never shows on the public site
    console.log('✓ Project placeholder seeded (1 draft — invisible to public).');
  } else {
    console.log(`  Projects table already has ${projCount} row(s) — skipping placeholder seed.`);
  }

  // ── Studio Updates placeholder — only if blog_posts table is empty ───────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id           SERIAL PRIMARY KEY,
      title        TEXT NOT NULL,
      slug         TEXT NOT NULL UNIQUE,
      excerpt      TEXT,
      content      TEXT,
      cover_url    TEXT,
      published    BOOLEAN NOT NULL DEFAULT TRUE,
      published_at TIMESTAMPTZ DEFAULT NOW(),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  const { rows: [{ count: blogCount }] } = await db.query('SELECT COUNT(*) AS count FROM blog_posts');
  if (parseInt(blogCount, 10) === 0) {
    await db.query(`
      INSERT INTO blog_posts (title, slug, excerpt, content, cover_url, published)
      VALUES (
        'Welcome to VR1 Studio',
        'welcome-to-vr1-studio',
        'We are officially launching VR1 Digital Studio — building modern websites, growth-focused digital experiences, and high-performance applications.',
        'VR1 is a digital studio dedicated to building performant web applications, custom websites, and digital growth strategies for businesses and ambitious brands. Managed directly from our custom admin suite.',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
        true
      )
    `);
    console.log('✓ Studio update placeholder seeded (1 update).');
  } else {
    console.log(`  Blog_posts table already has ${blogCount} row(s) — skipping placeholder seed.`);
  }

  // ── Pricing placeholders ───────────────────────────────────────────────────────
  
  // Settings
  const { rows: [{ count: settingsCount }] } = await db.query('SELECT COUNT(*) AS count FROM pricing_settings');
  if (parseInt(settingsCount, 10) === 0) {
    await db.query(`
      INSERT INTO pricing_settings (hero_title, hero_subtitle, cta_text, cta_link, bottom_cta_title, bottom_cta_text, bottom_cta_link)
      VALUES (
        'Simple, Transparent Website Pricing',
        'Choose the level of website your business needs. Every project is planned around your goals, features and requirements.',
        'Start Your Project',
        '/contact.html',
        'Don''t see what you need?',
        'Every business is different. If you need a custom website, booking system, customer portal, CRM, automation or another custom solution, tell us what you''re looking for.',
        '/contact.html'
      )
    `);
    console.log('✓ Pricing settings seeded.');
  }

  // Plans
  const { rows: [{ count: plansCount }] } = await db.query('SELECT COUNT(*) AS count FROM pricing_plans');
  if (parseInt(plansCount, 10) === 0) {
    await db.query(`
      INSERT INTO pricing_plans (name, price, price_suffix, description, features, is_popular, sort_order) VALUES
      ('Starter Website', '₹12,999', '', 'For businesses that need a professional online presence.', ARRAY['Up to 5 pages', 'Responsive design', 'Home, About, Services & Contact', 'WhatsApp integration', 'Google Maps integration', 'Contact form', 'Social media integration', 'Basic SEO', 'SSL', 'Deployment', '7 days support'], false, 1),
      ('Business Website', '₹24,999', '', 'For growing businesses that need a stronger online presence.', ARRAY['Up to 10 pages', 'Premium UI/UX', 'Services / Products', 'Testimonials', 'Gallery', 'FAQ', 'Lead enquiry forms', 'WhatsApp integration', 'Click-to-call', 'Google Business integration', 'Advanced SEO', 'Analytics', 'Performance optimization', 'Basic content management', '30 days support'], true, 2),
      ('Professional CMS Website', '₹39,999', '', 'For businesses that want complete control over their website.', ARRAY['Custom professional UI/UX', 'Secure admin login', 'Admin dashboard', 'Content management system', 'Service / Product management', 'Gallery management', 'Testimonials management', 'Team management', 'Offers / Promotions', 'FAQ management', 'Blog management', 'Enquiry management', 'Image uploads', 'Database', 'SEO management', 'Custom content sections', '60 days support'], false, 3),
      ('Custom Website / Web Application', 'Starting at ₹59,999', '', 'For businesses requiring custom functionality and advanced systems.', ARRAY['Custom UI/UX', 'Advanced admin dashboard', 'Authentication', 'Customer dashboards', 'Staff dashboards', 'Online booking', 'Payment integration', 'CRM functionality', 'Lead management', 'Automation', 'Third-party APIs', 'Advanced database functionality', 'Custom workflows', 'Analytics', 'Custom integrations'], false, 4)
    `);
    console.log('✓ Pricing plans seeded.');
  }

  // Factors
  const { rows: [{ count: factorsCount }] } = await db.query('SELECT COUNT(*) AS count FROM pricing_factors');
  if (parseInt(factorsCount, 10) === 0) {
    await db.query(`
      INSERT INTO pricing_factors (title, description, icon, sort_order) VALUES
      ('Number of Pages', 'More pages require more design, content structure and development.', 'fa-regular fa-file-lines', 1),
      ('Design Complexity', 'Basic business websites cost less than highly customized interactive experiences.', 'fa-solid fa-pen-nib', 2),
      ('Admin Panel', 'If the client wants to manage content themselves, a CMS/admin system adds development work.', 'fa-solid fa-sliders', 3),
      ('Database', 'Dynamic websites that store and manage information require database functionality.', 'fa-solid fa-database', 4),
      ('Booking System', 'Online appointments, availability and booking workflows increase project complexity.', 'fa-regular fa-calendar-check', 5),
      ('Payments', 'Payment gateways and transaction workflows require additional integration and testing.', 'fa-solid fa-credit-card', 6),
      ('Custom Features', 'Special functionality, dashboards, automation and integrations increase development time.', 'fa-solid fa-code', 7),
      ('Support & Maintenance', 'Ongoing updates, monitoring and technical support can be purchased separately.', 'fa-solid fa-headset', 8)
    `);
    console.log('✓ Pricing factors seeded.');
  }

  // Addons
  const { rows: [{ count: addonsCount }] } = await db.query('SELECT COUNT(*) AS count FROM pricing_addons');
  if (parseInt(addonsCount, 10) === 0) {
    await db.query(`
      INSERT INTO pricing_addons (name, price, description, sort_order) VALUES
      ('Additional Page', '₹1,500+', '', 1),
      ('Advanced Landing Page', '₹3,000+', '', 2),
      ('CMS / Admin Module', '₹5,000+', '', 3),
      ('Online Booking', '₹8,000+', '', 4),
      ('Payment Gateway', '₹5,000+', '', 5),
      ('Blog System', '₹5,000+', '', 6),
      ('Advanced Gallery', '₹3,000+', '', 7),
      ('Lead Management', '₹2,500+', '', 8),
      ('Third-party API Integration', '₹5,000+', '', 9),
      ('WhatsApp Automation', '₹5,000+', '', 10),
      ('Advanced SEO', '₹7,500+', '', 11),
      ('Custom Feature', 'Get a Quote', '', 12)
    `);
    console.log('✓ Pricing addons seeded.');
  }

  // Maintenance Plans
  const { rows: [{ count: maintenanceCount }] } = await db.query('SELECT COUNT(*) AS count FROM maintenance_plans');
  if (parseInt(maintenanceCount, 10) === 0) {
    await db.query(`
      INSERT INTO maintenance_plans (name, price, billing_period, description, features, sort_order, is_popular, cta_text, cta_link) VALUES
      ('Basic Care', '₹999', '/ month', 'For businesses that need basic website maintenance and technical support.', ARRAY['Website health checks', 'Basic security checks', 'Minor content updates', 'Text/content corrections', 'Basic image replacements', 'Technical support', 'Backup checks', 'Monthly maintenance review'], 1, false, 'Choose Basic Care', '/contact.html'),
      ('Business Care', '₹1,999', '/ month', 'For growing businesses that want regular updates and reliable website support.', ARRAY['Everything in Basic Care', 'Regular website updates', 'Multiple content changes', 'Image and gallery updates', 'Service / product updates', 'Basic performance monitoring', 'Security monitoring', 'Backup management', 'Minor layout adjustments', 'Priority support'], 2, true, 'Choose Business Care', '/contact.html'),
      ('Premium Care', '₹3,999', '/ month', 'For businesses that need priority support and ongoing website improvements.', ARRAY['Everything in Business Care', 'Priority technical support', 'Frequent content updates', 'Advanced website monitoring', 'Performance optimization', 'Security monitoring', 'Backup management', 'Minor feature improvements', 'Landing page/content updates', 'Monthly website review', 'Priority maintenance requests'], 3, false, 'Choose Premium Care', '/contact.html')
    `);
    console.log('✓ Maintenance plans seeded.');
  }

  // FAQs
  const { rows: [{ count: faqCount }] } = await db.query('SELECT COUNT(*) AS count FROM pricing_faqs');
  if (parseInt(faqCount, 10) === 0) {
    await db.query(`
      INSERT INTO pricing_faqs (question, answer, sort_order) VALUES
      ('Why does website pricing vary?', 'Website pricing varies based on the number of pages, design complexity, functionality, and integrations required.', 1),
      ('Is hosting included?', 'We can recommend hosting providers or include hosting in a custom quote, but it is typically a separate ongoing cost unless specified.', 2),
      ('Is a domain included?', 'Domain names are usually purchased by the client to ensure ownership, but we can assist with the process.', 3),
      ('Can I update my website myself?', 'Yes, if you choose a CMS (Content Management System) package, you will be able to update text, images, and other content yourself.', 4),
      ('What is a CMS?', 'A CMS (Content Management System) is an admin panel that allows you to log in and manage your website content without needing to write code.', 5),
      ('Can you add online booking later?', 'Absolutely! We build websites that can grow with your business. Features like booking or payments can be added in the future.', 6),
      ('Can you add payment functionality later?', 'Yes, e-commerce and payment gateways can be integrated at any time.', 7),
      ('Do you provide maintenance?', 'Yes, we offer ongoing maintenance and support plans to keep your website secure, fast, and up-to-date.', 8),
      ('How long does a website take to build?', 'A simple starter website may take 1-2 weeks, while a complex custom web application can take several months. We provide clear timelines with every proposal.', 9),
      ('What happens after the website is launched?', 'After launch, we provide a warranty period for bug fixes. You can also opt into one of our maintenance plans for ongoing support and updates.', 10)
    `);
    console.log('✓ Pricing FAQs seeded.');
  }

  console.log('\nSeed complete. Run the server: npm run dev');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
