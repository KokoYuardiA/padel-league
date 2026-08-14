-- ============================================================
-- Migration 0009: create the `avatars` Storage bucket + RLS policies
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql (and migrations 0001-0008).
-- ============================================================
--
-- frontend/src/app/profile/page.tsx already calls
-- supabase.storage.from('avatars').upload(`${user.id}/${Date.now()}-${file.name}`, file)
-- and then storage.from('avatars').getPublicUrl(path) — but the bucket itself
-- has never been created, so every upload attempt fails today (Track A item,
-- ROADMAP.md). This migration creates it and wires up the minimum RLS needed:
-- public read (getPublicUrl only works if the bucket is public) and
-- write access restricted to a user's own folder (path is always prefixed
-- with their own user id, so this can't be used to overwrite anyone else's
-- avatar).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (bucket is public, but storage.objects RLS still gates
-- direct table access — this keeps that path consistent with the public
-- bucket flag, not strictly required for getPublicUrl itself).
CREATE POLICY "avatars: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- An authenticated user may only upload into a path whose first folder
-- segment is their own auth.uid() — matches the `${user.id}/...` path the
-- frontend already constructs.
CREATE POLICY "avatars: users upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- `upload(..., { upsert: true })` in the frontend can hit this path on a
-- retry with the same key — needs UPDATE permission too, same ownership rule.
CREATE POLICY "avatars: users update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
