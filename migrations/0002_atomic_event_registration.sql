-- ============================================================
-- Migration 0002: atomic event registration
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql — do not re-run schema.sql itself.
-- ============================================================
--
-- backend/src/routes/events.routes.ts previously counted current registrations
-- and then inserted as two separate round-trips (a TOCTOU race): two concurrent
-- registration requests arriving right at capacity could both read the same
-- "not full yet" count and both insert as 'registered', pushing the event over
-- max_players. This function moves the count-then-insert into a single
-- transaction and locks the event row first (SELECT ... FOR UPDATE), so a
-- second concurrent call blocks until the first commits and sees its effect.

CREATE OR REPLACE FUNCTION public.register_for_event(p_event_id UUID, p_user_id UUID)
RETURNS public.event_registrations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_reg_count INT;
  v_status registration_status_enum;
  v_registration public.event_registrations;
BEGIN
  -- Locks the event row so a concurrent call for the same event waits here
  -- until this transaction commits, making the count-then-insert below atomic.
  SELECT id, max_players, status INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND';
  END IF;

  IF v_event.status <> 'Open' THEN
    RAISE EXCEPTION 'EVENT_NOT_OPEN';
  END IF;

  SELECT COUNT(*) INTO v_reg_count
  FROM public.event_registrations
  WHERE event_id = p_event_id AND status = 'registered';

  IF v_reg_count >= v_event.max_players THEN
    v_status := 'waiting_list';
  ELSE
    v_status := 'registered';
  END IF;

  INSERT INTO public.event_registrations (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, v_status)
  RETURNING * INTO v_registration;

  RETURN v_registration;
END;
$$;
