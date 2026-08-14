-- ============================================================
-- Migration 0003: atomic schedule generation
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql — do not re-run schema.sql itself.
-- ============================================================
--
-- Phase 2a's "Generate Schedule" endpoint computes the match rows in Node
-- (pure functions under backend/src/services/scheduling/, no DB access) but
-- needs the "no schedule exists yet" check and the bulk insert to happen
-- atomically — otherwise two near-simultaneous clicks (double-click, or two
-- co-organizers) could both pass the empty check and both insert, producing
-- a duplicated schedule. Same TOCTOU class already closed for registration
-- via register_for_event() in migration 0002; this mirrors that pattern by
-- locking the event row first.

CREATE OR REPLACE FUNCTION public.generate_event_schedule(p_event_id UUID, p_matches JSONB)
RETURNS SETOF public.matches
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Locks the event row so a concurrent call for the same event waits here
  -- until this transaction commits, making the exists-check + insert atomic.
  PERFORM 1 FROM public.events WHERE id = p_event_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.matches WHERE event_id = p_event_id) THEN
    RAISE EXCEPTION 'SCHEDULE_ALREADY_EXISTS';
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
