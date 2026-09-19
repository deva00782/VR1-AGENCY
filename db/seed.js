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

  console.log('\nSeed complete. Run the server: npm run dev');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
