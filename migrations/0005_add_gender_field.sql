-- ============================================================
-- Migration 0005: gender field for Mixed Partner
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql — do not re-run schema.sql itself.
-- ============================================================
--
-- The Mixed Partner format requires gender-balanced teams (PRD.md:132), but
-- `profiles` never had a gender column. Nullable, no default — existing
-- profiles stay NULL until the player fills it in via the profile page.
-- Registration for a Mixed Partner event is blocked at the API level
-- (events.routes.ts POST /:id/register) until this is set; every other
-- format doesn't touch this column at all. Governed by the existing
-- `profiles: update own` RLS policy — no new policy needed.

CREATE TYPE gender_enum AS ENUM ('Male', 'Female');

ALTER TABLE public.profiles ADD COLUMN gender gender_enum;
