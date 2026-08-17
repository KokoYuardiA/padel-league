-- ============================================================
-- Rally Hub — Supabase PostgreSQL Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================
CREATE TYPE skill_level_enum AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'Pro');

CREATE TYPE group_member_role_enum AS ENUM ('Group Admin', 'Organizer', 'Player');

CREATE TYPE event_format_enum AS ENUM (
  'Americano',
  'Mexicano',
  'Fixed Partner',
  'Mixed Partner',
  'Round Robin'
);

CREATE TYPE event_status_enum AS ENUM (
  'Draft',
  'Open',
  'Full',
  'In Progress',
  'Completed',
  'Cancelled'
);

CREATE TYPE registration_status_enum AS ENUM ('registered', 'waiting_list', 'withdrawn');

CREATE TYPE match_status_enum AS ENUM (
  'in_progress',
  'pending_confirmation',
  'confirmed',
  'disputed'
);

-- ============================================================
-- TABLE: profiles
-- Extends Supabase auth.users. Created via trigger on signup.
-- ============================================================
CREATE TABLE public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  avatar_url     TEXT,
  phone_number   TEXT NOT NULL, -- WhatsApp-reachable, required for score confirmation
  skill_level    skill_level_enum NOT NULL DEFAULT 'Beginner',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile row when a new Supabase Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Player'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE: groups
-- Represents a padel club / community (multi-tenant boundary)
-- ============================================================
CREATE TABLE public.groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: group_members
-- Membership + role per group (multi-tenant isolation boundary)
-- ============================================================
CREATE TABLE public.group_members (
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        group_member_role_enum NOT NULL DEFAULT 'Player',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ============================================================
-- TABLE: events
-- A padel event created by an Organizer inside a group
-- ============================================================
CREATE TABLE public.events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  format                event_format_enum NOT NULL,
  event_date            DATE NOT NULL,
  start_time            TIME NOT NULL,
  location              TEXT NOT NULL,
  courts_count          SMALLINT NOT NULL CHECK (courts_count >= 1),
  max_players           SMALLINT NOT NULL CHECK (max_players >= 4),
  registration_deadline TIMESTAMPTZ,
  status                event_status_enum NOT NULL DEFAULT 'Draft',
  created_by            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: event_registrations
-- Player registration or waiting list for an event
-- ============================================================
CREATE TABLE public.event_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- for Fixed/Mixed Partner formats
  status          registration_status_enum NOT NULL DEFAULT 'registered',
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- ============================================================
-- TABLE: matches
-- A single match within an event round
-- ============================================================
CREATE TABLE public.matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round_number      SMALLINT NOT NULL,
  court_number      SMALLINT NOT NULL,
  team_a_player1    UUID NOT NULL REFERENCES public.profiles(id),
  team_a_player2    UUID REFERENCES public.profiles(id), -- null for singles-style if ever needed
  team_b_player1    UUID NOT NULL REFERENCES public.profiles(id),
  team_b_player2    UUID REFERENCES public.profiles(id),
  score_a           SMALLINT CHECK (score_a >= 0),
  score_b           SMALLINT CHECK (score_b >= 0),
  status            match_status_enum NOT NULL DEFAULT 'in_progress',
  reported_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  needs_confirm_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_group_members_user ON public.group_members (user_id);
CREATE INDEX idx_events_group ON public.events (group_id);
CREATE INDEX idx_registrations_event ON public.event_registrations (event_id);
CREATE INDEX idx_registrations_user ON public.event_registrations (user_id);
CREATE INDEX idx_matches_event ON public.matches (event_id);
CREATE INDEX idx_matches_round ON public.matches (event_id, round_number);

-- ============================================================
-- UPDATED_AT auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - MULTI-TENANT ISOLATION
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
-- Users can only read their own profile and update their own profile.
-- Profiles of other members in the same group can be read (for leaderboard display).
CREATE POLICY "profiles: read own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: read group members" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = public.profiles.id
    )
  );

CREATE POLICY "profiles: update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ---- groups ----
-- Authenticated users can create groups.
-- Members of a group can view it.
-- Group Admin can update their own group.
CREATE POLICY "groups: read if member or public" ON public.groups
  FOR SELECT USING (
    is_public = TRUE
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = public.groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "groups: insert authenticated" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "groups: update by admin" ON public.groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = public.groups.id
        AND user_id = auth.uid()
        AND role = 'Group Admin'
    )
  );

-- ---- group_members ----
-- Only members of a group can view other members in that group.
-- Group Admin can manage membership in their group.
CREATE POLICY "group_members: read if same group" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_members.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_members: insert by admin or self-join" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() -- self-join (via invite link)
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = public.group_members.group_id
        AND user_id = auth.uid()
        AND role = 'Group Admin'
    )
  );

CREATE POLICY "group_members: delete by admin" ON public.group_members
  FOR DELETE USING (
    user_id = auth.uid() -- leave group yourself
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = public.group_members.group_id
        AND user_id = auth.uid()
        AND role = 'Group Admin'
    )
  );

-- ---- events ----
-- Members of a group can view that group's events.
-- Organizers or Group Admin can create/update events within their group.
CREATE POLICY "events: read if group member" ON public.events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = public.events.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "events: insert by organizer or admin" ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = public.events.group_id
        AND user_id = auth.uid()
        AND role IN ('Organizer', 'Group Admin')
    )
  );

CREATE POLICY "events: update by organizer or admin" ON public.events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = public.events.group_id
        AND user_id = auth.uid()
        AND role IN ('Organizer', 'Group Admin')
    )
  );

-- ---- event_registrations ----
-- Players who are group members can register for group events.
-- Organizers/Admins can manage the waiting list.
CREATE POLICY "registrations: read if group member" ON public.event_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.id = public.event_registrations.event_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "registrations: insert self" ON public.event_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "registrations: update by organizer or admin" ON public.event_registrations
  FOR UPDATE USING (
    user_id = auth.uid() -- withdraw yourself
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.id = public.event_registrations.event_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('Organizer', 'Group Admin')
    )
  );

-- ---- matches ----
-- Group members can view matches. Players in a match can update score.
-- Organizers/Admins can override any score.
CREATE POLICY "matches: read if group member" ON public.matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.id = public.matches.event_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "matches: insert by organizer or admin" ON public.matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.id = public.matches.event_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('Organizer', 'Group Admin')
    )
  );

CREATE POLICY "matches: update by player in match or organizer" ON public.matches
  FOR UPDATE USING (
    -- Players in the match can update score
    auth.uid() IN (
      team_a_player1, team_a_player2,
      team_b_player1, team_b_player2
    )
    OR
    -- Organizers/Admins can override
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.id = public.matches.event_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('Organizer', 'Group Admin')
    )
  );
