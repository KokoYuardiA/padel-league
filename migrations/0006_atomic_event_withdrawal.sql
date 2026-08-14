-- ============================================================
-- Migration 0006: atomic event withdrawal + waitlist auto-promotion
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql — do not re-run schema.sql itself.
-- ============================================================
--
-- POST /api/events/:id/withdraw (backend/src/routes/events.routes.ts) lets a
-- player flip their own registration to 'withdrawn'. If they were previously
-- 'registered' (not 'waiting_list'), a spot just opened up — the earliest
-- waiting_list registration (by registered_at) is auto-promoted, but only if
-- we're still inside the promotion window (PRD §4.1: up until registration
-- deadline / event start, whichever is earlier). Two players withdrawing
-- from the same event at nearly the same instant must not both see (and
-- promote into) the same waitlisted row — same TOCTOU class already closed
-- for registration (0002), schedule generation (0003), and Mexicano rounds
-- (0004). Locks the event row first, same convention.
--
-- p_promotion_cutoff is computed in TypeScript
-- (backend/src/lib/promotionWindow.ts) from event_date/start_time/
-- registration_deadline read *before* this call — safe today because
-- nothing ever updates those columns post-creation (only `status` is ever
-- patched). If an "edit event" endpoint is ever added that can change them,
-- this needs revisiting (recompute the cutoff from a value read under the
-- lock instead of passed in).
--
-- Exception order: EVENT_NOT_FOUND -> EVENT_NOT_WITHDRAWABLE ->
-- REGISTRATION_NOT_FOUND -> ALREADY_WITHDRAWN (mirrors register_for_event's
-- "validate the event before touching event_registrations" order).

CREATE OR REPLACE FUNCTION public.withdraw_from_event(
  p_event_id UUID,
  p_user_id UUID,
  p_promotion_cutoff TIMESTAMPTZ
)
RETURNS TABLE (
  withdrawn_registration_id UUID,
  previous_status registration_status_enum,
  promoted_registration_id UUID,
  promoted_user_id UUID,
  promotion_window_expired BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event_status event_status_enum;
  v_registration_id UUID;
  v_current_status registration_status_enum;
  v_promoted_id UUID := NULL;
  v_promoted_user UUID := NULL;
  v_window_expired BOOLEAN := FALSE;
BEGIN
  -- Locks the event row so a concurrent withdraw/register/generate-schedule
  -- for the same event serializes behind this transaction (same convention
  -- as 0002-0004).
  SELECT status INTO v_event_status
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND';
  END IF;

  IF v_event_status NOT IN ('Open', 'Full', 'In Progress') THEN
    RAISE EXCEPTION 'EVENT_NOT_WITHDRAWABLE';
  END IF;

  SELECT id, status INTO v_registration_id, v_current_status
  FROM public.event_registrations
  WHERE event_id = p_event_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_FOUND';
  END IF;

  IF v_current_status = 'withdrawn' THEN
    RAISE EXCEPTION 'ALREADY_WITHDRAWN';
  END IF;

  UPDATE public.event_registrations
  SET status = 'withdrawn'
  WHERE id = v_registration_id;

  -- Only a 'registered' departure frees a spot; a 'waiting_list' withdrawal
  -- changes nothing for anyone else (their position numbers still shift on
  -- the frontend, but that's recomputed client-side from the broadcast, not
  -- a promotion).
  IF v_current_status = 'registered' THEN
    IF now() > p_promotion_cutoff THEN
      v_window_expired := TRUE;
    ELSE
      SELECT id, user_id INTO v_promoted_id, v_promoted_user
      FROM public.event_registrations
      WHERE event_id = p_event_id AND status = 'waiting_list'
      ORDER BY registered_at ASC
      LIMIT 1
      FOR UPDATE;

      IF FOUND THEN
        UPDATE public.event_registrations
        SET status = 'registered'
        WHERE id = v_promoted_id;
      ELSE
        v_promoted_id := NULL;
        v_promoted_user := NULL;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_registration_id, v_current_status, v_promoted_id, v_promoted_user, v_window_expired;
END;
$$;
