-- ============================================================
-- Migration 0004: atomic Mexicano next-round generation
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql — do not re-run schema.sql itself.
-- ============================================================
--
-- Mexicano's round N+1 depends on round N's confirmed standings, so it's
-- generated one wave at a time via POST /api/events/:id/generate-next-round
-- (backend/src/routes/schedule.routes.ts), gated on "every existing match for
-- this event is confirmed". Two near-simultaneous calls (double-click, or two
-- co-organizer tabs) could otherwise both pass that gate and both insert a
-- next wave — the same TOCTOU race class already closed for registration
-- (migration 0002) and initial schedule generation (migration 0003). This
-- function closes it for incremental Mexicano rounds by locking the event row
-- and re-checking atomically before inserting.
--
-- Check order matters: round-state must be verified BEFORE the confirmation
-- check. If a second caller's request is checked while it's serialized behind
-- a first caller that already inserted the next wave, that new wave's matches
-- default to status 'in_progress' (schema.sql), not 'confirmed' — checking
-- confirmation first would make the second caller misreport
-- PREVIOUS_ROUND_NOT_CONFIRMED when the real issue is that someone else
-- already generated the next round (ROUND_STATE_CHANGED).

CREATE OR REPLACE FUNCTION public.generate_next_mexicano_round(
  p_event_id UUID,
  p_expected_last_round SMALLINT,
  p_matches JSONB
)
RETURNS SETOF public.matches
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actual_last_round SMALLINT;
  v_incomplete_count INT;
BEGIN
  PERFORM 1 FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND';
  END IF;

  SELECT COALESCE(MAX(round_number), 0) INTO v_actual_last_round
  FROM public.matches WHERE event_id = p_event_id;

  IF v_actual_last_round <> p_expected_last_round THEN
    RAISE EXCEPTION 'ROUND_STATE_CHANGED';
  END IF;

  SELECT COUNT(*) INTO v_incomplete_count
  FROM public.matches WHERE event_id = p_event_id AND status <> 'confirmed';

  IF v_incomplete_count > 0 THEN
    RAISE EXCEPTION 'PREVIOUS_ROUND_NOT_CONFIRMED';
  END IF;

  RETURN QUERY
  INSERT INTO public.matches (
    event_id, round_number, court_number,
    team_a_player1, team_a_player2, team_b_player1, team_b_player2
  )
  SELECT
    p_event_id,
    (m->>'round_number')::SMALLINT,
    (m->>'court_number')::SMALLINT,
    (m->>'team_a_player1')::UUID,
    NULLIF(m->>'team_a_player2', '')::UUID,
    (m->>'team_b_player1')::UUID,
    NULLIF(m->>'team_b_player2', '')::UUID
  FROM jsonb_array_elements(p_matches) AS m
  RETURNING *;
END;
$$;
