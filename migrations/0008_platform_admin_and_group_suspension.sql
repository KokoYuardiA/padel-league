-- ============================================================
-- Migration 0008: platform_admins table + group suspension
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql (and migrations 0001-0007) — do not
-- re-run schema.sql itself.
-- ============================================================

-- ── groups.suspended_at ──────────────────────────────────────
-- NULL = active. Non-null = suspended by a Platform Admin. Blocks ALL
-- activity in the group for everyone (see requireGroupRole() change in
-- backend/src/middlewares/rbac.middleware.ts, and the join-by-invite-code
-- gate in groups.routes.ts) and hides it from /api/public/groups
-- discovery. GET /api/groups (a member's own list) still surfaces it
-- rather than silently hiding it — see groups.routes.ts change.
ALTER TABLE public.groups ADD COLUMN suspended_at TIMESTAMPTZ NULL;

-- ============================================================
-- TABLE: platform_admins
-- Grants platform-wide admin rights. Deliberately a separate table, not
-- a column on profiles: profiles' "update own" RLS policy
-- (FOR UPDATE USING (auth.uid() = id)) has no WITH CHECK restricting
-- which columns a user may change via a direct anon-client call, so a
-- boolean/enum column here would be self-promotable. This table has NO
-- INSERT/UPDATE/DELETE/SELECT policy for any role reachable by a normal
-- authenticated user — RLS is enabled with zero permissive policies,
-- i.e. fully deny-all from the anon/authenticated roles. Only
-- supabaseAdmin (service-role key, bypasses RLS) and the SECURITY
-- DEFINER function below (owner bypasses RLS) can read/write it.
-- ============================================================
CREATE TABLE public.platform_admins (
  user_id     UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
-- Intentionally no CREATE POLICY statements here — see comment above.

-- ── is_platform_admin() ──────────────────────────────────────
-- SECURITY DEFINER, following the exact pattern established in migration
-- 0007 (is_group_member / is_group_admin) — bypasses platform_admins'
-- RLS internally since the function owner owns the table.
CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = p_user_id
  );
$$;

-- ── groups: platform admin full access ───────────────────────
-- Defense-in-depth only, not load-bearing — every Express admin route
-- uses supabaseAdmin (service-role), same as the rest of the app.
-- Deliberately not sprawled to events/matches/event_registrations/
-- profiles — Express never uses an RLS-scoped client, so those policies
-- would never actually be exercised.
CREATE POLICY "groups: platform admin full access" ON public.groups
  FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ============================================================
-- BOOTSTRAP: granting the first Platform Admin
-- There is no UI or API route to grant platform-admin status (by
-- design — see table comment above). To create the very first Platform
-- Admin after running this migration, run manually in the Supabase SQL
-- Editor, substituting the target user's UUID (find it via Supabase
-- Auth > Users, or `SELECT id FROM auth.users WHERE email = '...'`):
--
--   INSERT INTO public.platform_admins (user_id) VALUES ('<uuid-here>');
--
-- Grant additional admins the same way later.
-- ============================================================
