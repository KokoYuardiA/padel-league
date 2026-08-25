-- ============================================================
-- Migration 0011: enable Supabase Realtime (Postgres Changes) for
-- live scoring, replacing the self-hosted Socket.IO broadcast layer.
-- Run this in the Supabase SQL Editor against every project that
-- runs this app — the existing dev project AND any production
-- project — Realtime publication membership is per-project and is
-- not something migrations run automatically.
-- ============================================================
--
-- RLS already covers what Realtime needs to deliver correctly:
-- "matches: read if group member" and "registrations: read if group
-- member" (schema.sql) already gate SELECT per subscriber. No RLS
-- changes here. Default replica identity (primary key only) is also
-- sufficient — the frontend only ever reads `payload.new`, never
-- `payload.old`.

ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
