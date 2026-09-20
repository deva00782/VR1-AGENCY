-- VR1 Digital Studio — Database Schema
-- Run with: psql $DATABASE_URL -f db/schema.sql

-- Admin users (VR1 team only)
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt, never stored plain
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact / project inquiries from the public form
CREATE TABLE IF NOT EXISTS inquiries (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  business     TEXT,
  project_type TEXT,
  budget       TEXT,
  message      TEXT NOT NULL,
  notes        TEXT,            -- internal admin notes (v2)
  status       TEXT NOT NULL DEFAULT 'NEW'
               CHECK (status IN ('NEW','CONTACTED','DISCUSSION','PROPOSAL','ACTIVE','COMPLETED')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiries_status_idx  ON inquiries (status);
CREATE INDEX IF NOT EXISTS inquiries_created_idx ON inquiries (created_at DESC);

-- Portfolio projects (managed through admin dashboard)
CREATE TABLE IF NOT EXISTS projects (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  technologies TEXT[],          -- array of strings e.g. '{React,Node.js,PostgreSQL}'
  image_url    TEXT,            -- hosted on Supabase / Cloudinary (v2)
  live_url     TEXT,
  github_url   TEXT,
  featured     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INT NOT NULL DEFAULT 0,
  published    BOOLEAN NOT NULL DEFAULT TRUE,
  case_study_url TEXT,          -- future
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_featured_idx ON projects (featured DESC, sort_order ASC);

-- Team members (managed through admin dashboard)
CREATE TABLE IF NOT EXISTS team (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  bio          TEXT,
  skills       TEXT[],          -- array of skill strings
  github_url   TEXT,
  resume_url   TEXT,
  linkedin_url TEXT,
  twitter_url  TEXT,            -- future
  portfolio_url TEXT,           -- future
  photo_url    TEXT,            -- hosted externally (v2)
  member_order INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_inquiries_updated_at ON inquiries;
CREATE TRIGGER set_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_projects_updated_at ON projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_team_updated_at ON team;
CREATE TRIGGER set_team_updated_at
  BEFORE UPDATE ON team
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Studio Updates / Blog posts (managed through admin dashboard)
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

CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts (published DESC, published_at DESC);

DROP TRIGGER IF EXISTS set_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

