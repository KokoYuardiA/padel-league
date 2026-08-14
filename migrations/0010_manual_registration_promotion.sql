-- ============================================================
-- Migration 0010: organizer manual promotion of a specific waiting-list
-- registration
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql (and migrations 0001-0009) — do not
-- re-run schema.sql itself.
-- ============================================================
--
-- POST /api/events/:id/registrations/:registrationId/promote
-- (backend/src/routes/events.routes.ts) lets an Organizer/Group Admin promote
-- ONE specific waiting-list registration — distinct from withdraw_from_event's
-- (migrations/0006) automatic "always the earliest by registered_at" logic,
-- this lets the organizer pick a specific player out of order (e.g. for
-- skill balance). Capacity is still enforced, no override: rejected with
-- EVENT_FULL if the event is already at max_players — same rule
-- register_for_event (migrations/0002) already applies at registration time.
--
-- Locks the events row first, same convention as 0002/0003/0004/0006, so this
-- can't race past max_players even if called concurrently with a new
-- registration or another withdrawal's own auto-promotion — both of those
-- also take FOR UPDATE on the events row before touching event_registrations.
--
-- Exception order: EVENT_NOT_FOUND -> EVENT_NOT_PROMOTABLE ->
-- REGISTRATION_NOT_FOUND -> NOT_WAITLISTED -> EVENT_FULL.

CREATE OR REPLACE FUNCTION public.promote_registration(
  p_event_id UUID,
  p_registration_id UUID
)
RETURNS TABLE (
  promoted_registration_id UUID,
  promoted_user_id UUID
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_registration RECORD;
  v_reg_count INT;
BEGIN
  -- Locks the event row so a concurrent register/withdraw/promote for the
  -- same event serializes behind this transaction (same convention as
  -- 0002/0003/0004/0006).
  SELECT id, max_players, status INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND';
  END IF;

  IF v_event.status NOT IN ('Open', 'Full', 'In Progress') THEN
    RAISE EXCEPTION 'EVENT_NOT_PROMOTABLE';
  END IF;

  SELECT id, user_id, status INTO v_registration
  FROM public.event_registrations
  WHERE id = p_registration_id AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_FOUND';
  END IF;

  IF v_registration.status <> 'waiting_list' THEN
    RAISE EXCEPTION 'NOT_WAITLISTED';
  END IF;

  SELECT COUNT(*) INTO v_reg_count
  FROM public.event_registrations
  WHERE event_id = p_event_id AND status = 'registered';

  IF v_reg_count >= v_event.max_players THEN
    RAISE EXCEPTION 'EVENT_FULL';
  END IF;

  UPDATE public.event_registrations
  SET status = 'registered'
  WHERE id = v_registration.id;

  RETURN QUERY SELECT v_registration.id, v_registration.user_id;
END;
$$;
