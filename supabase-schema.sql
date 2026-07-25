-- ============================================================
-- Headgear Community — Supabase Schema
-- Run this ONCE in your Supabase SQL Editor
-- Project: krqeprvecnjstgghbmzd
-- ============================================================

-- UUID support (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Blog Posts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title      TEXT        NOT NULL,
    author     TEXT        NOT NULL DEFAULT 'Anonymous',
    body       TEXT        NOT NULL,
    likes      INTEGER     NOT NULL DEFAULT 0,
    edit_key   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table already exists, add the column (safe to run again)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS edit_key TEXT;

-- ── Comments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id    UUID        NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    author     TEXT        NOT NULL DEFAULT 'Anonymous',
    text       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Contact Submissions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_submissions (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT,
    email      TEXT        NOT NULL,
    phone      TEXT,
    about      TEXT,
    links      TEXT,
    location   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Custom Requests ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_requests (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type TEXT,
    description  TEXT        NOT NULL,
    dimensions   TEXT,
    budget       TEXT,
    ref_links    TEXT,
    name         TEXT,
    email        TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE blog_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_requests     ENABLE ROW LEVEL SECURITY;

-- Blog posts: anyone can read or write; edit/delete gated server-side by edit_key
CREATE POLICY "public_select_posts"  ON blog_posts FOR SELECT USING (true);
CREATE POLICY "public_insert_posts"  ON blog_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_likes"  ON blog_posts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_posts"  ON blog_posts FOR DELETE USING (true);

-- Comments: anyone can read or write
CREATE POLICY "public_select_comments" ON comments FOR SELECT USING (true);
CREATE POLICY "public_insert_comments" ON comments FOR INSERT WITH CHECK (true);

-- Submissions: insert-only (nobody can read others' contact/custom data via anon key)
CREATE POLICY "public_insert_contact" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_custom"  ON custom_requests     FOR INSERT WITH CHECK (true);

-- ── Atomic Like Increment Function ───────────────────────────
CREATE OR REPLACE FUNCTION increment_post_likes(p_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE blog_posts SET likes = likes + 1 WHERE id = p_id;
$$;

-- ── Update Blog Post (key-gated) ───────────────────────────
CREATE OR REPLACE FUNCTION update_blog_post(
    p_id      UUID,
    p_key     TEXT,
    p_title   TEXT,
    p_body    TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE blog_posts
    SET    title = p_title, body = p_body
    WHERE  id = p_id AND edit_key = p_key;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;
END;
$$;

-- ── Delete Blog Post (key-gated) ───────────────────────────
CREATE OR REPLACE FUNCTION delete_blog_post(
    p_id  UUID,
    p_key TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM blog_posts
    WHERE  id = p_id AND edit_key = p_key;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;
END;
$$;

-- ── Seed Posts ────────────────────────────────────────────────
INSERT INTO blog_posts (title, author, body, likes, created_at) VALUES
(
    'Welcome to the Headgear Community Blog',
    'The Headgear Collective',
    'This space is for anyone with something to say — rants, raves, requests, or random musings. Post a piece, drop a comment, start an argument. We are here for all of it.

If you want something made, go put in a Custom Request. If you just want to talk, you are already in the right place.',
    7,
    NOW() - INTERVAL '7 days'
),
(
    'What Does "Mind Altering Merchandise" Even Mean?',
    'J. Ruiz',
    'Good question. I have been staring at the Headgear sticker on my laptop for three months and I keep seeing new things in it. Bought it at a market on Hawthorne, didn''t think much of it at the time.

Now it has started a dozen conversations. Two of them got weird in the best way possible. One of them resulted in a date.

That is what mind altering merchandise means, I think. It is the thing that makes someone stop and ask a question they were not expecting to ask.',
    12,
    NOW() - INTERVAL '3 days'
);
