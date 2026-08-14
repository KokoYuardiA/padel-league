-- ============================================================
-- Migration 0001: group_members UPDATE policy
-- Run this in the Supabase SQL Editor against the project already
-- initialized by ../schema.sql — do not re-run schema.sql itself.
-- ============================================================
--
-- schema.sql defined INSERT and DELETE policies for group_members but no
-- UPDATE policy, so a role change (Player <-> Organizer) would be silently
-- denied by RLS even if application code allowed it. The backend's Phase 1
-- member-management endpoints use the service-role client (which bypasses
-- RLS) so they work without this migration, but the policy is added for
-- defense-in-depth consistency with every other table's admin-managed
-- access pattern.

CREATE POLICY "group_members: update role by admin" ON public.group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'Group Admin'
    )
  );
