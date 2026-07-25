-- ============================================================
-- Headgear — Edit/Delete Patch
-- Run this in your Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- 1. Add edit_key column (no-op if already exists)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS edit_key TEXT;

-- 2. DELETE policy (drop first so re-runs don't error)
DROP POLICY IF EXISTS "public_delete_posts" ON blog_posts;
CREATE POLICY "public_delete_posts" ON blog_posts FOR DELETE USING (true);

-- 3. update_blog_post RPC
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

-- 4. delete_blog_post RPC
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
