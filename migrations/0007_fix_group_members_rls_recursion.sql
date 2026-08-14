-- ============================================================
-- Migration 0007: fix infinite-recursion RLS bug on group_members
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql (and migrations 0001-0006) — do not
-- re-run schema.sql itself.
-- ============================================================
--
-- schema.sql's group_members policies (SELECT/INSERT/DELETE) and migration
-- 0001's UPDATE policy all subquery group_members FROM WITHIN a policy ON
-- group_members ("am I a member/admin of this group?" checked by SELECTing
-- from group_members itself). Evaluating that subquery re-triggers the very
-- same RLS policy on group_members, which re-triggers it again — Postgres
-- detects this as unbounded and raises "infinite recursion detected in
-- policy for relation \"group_members\"".
--
-- This was latent since day one: almost every read in this app goes through
-- supabaseAdmin (service-role key, bypasses RLS entirely — see the intro of
-- WORKFLOWS.md). The ONE path that hits this is the Profile page, which
-- talks to Supabase directly with the anon key (RLS enforced, no Express
-- route exists for it). Its `profiles` fetch triggers the "profiles: read
-- group members" policy, which subqueries group_members — the first real
-- RLS read of group_members in the whole app, and the first time this bug
-- could actually fire.
--
-- Standard fix: move the "am I a member/admin of this group" check into a
-- SECURITY DEFINER function. Table owners (which also own the function, in
-- this Supabase project) bypass their own tables' RLS by default, so the
-- function's internal SELECT on group_members runs RLS-free — breaking the
-- recursive cycle instead of re-triggering the very policy being evaluated.

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND role = 'Group Admin'
  );
$$;

DROP POLICY IF EXISTS "group_members: read if same group" ON public.group_members;
CREATE POLICY "group_members: read if same group" ON public.group_members
  FOR SELECT USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "group_members: insert by admin or self-join" ON public.group_members;
CREATE POLICY "group_members: insert by admin or self-join" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() -- self-join (via invite link)
    OR public.is_group_admin(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "group_members: delete by admin" ON public.group_members;
CREATE POLICY "group_members: delete by admin" ON public.group_members
  FOR DELETE USING (
    user_id = auth.uid() -- leave group yourself
    OR public.is_group_admin(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "group_members: update role by admin" ON public.group_members;
CREATE POLICY "group_members: update role by admin" ON public.group_members
  FOR UPDATE USING (public.is_group_admin(group_id, auth.uid()));
