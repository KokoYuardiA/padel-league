# Deployment Guide — Dedicated Account Setup

This guide walks through taking the app from a forked repo to a live production URL, using a
**dedicated GitHub account** (separate from the developer's personal account) so that the client owns
every piece of infrastructure directly. It assumes the repo has already been forked from
`KokoYuardiA/padel-league` into that dedicated account (currently `ekproject-collab/rally-hub`).

**Design goal: $0/month.** Every service below is chosen for its free tier, and every account should be
created **without a payment method attached** — that's what actually guarantees zero cost (a free-tier
limit is a soft promise; no card on file is a hard one). At this app's expected scale (a single padel
club/league), free-tier limits are very unlikely to ever be hit.

| Layer | Service | Free tier caveat |
|---|---|---|
| Database, Auth, Storage | [Supabase](https://supabase.com) | Project auto-pauses after 7 days with zero activity (see §6) |
| Backend (Express) | [Vercel](https://vercel.com) | Serverless Functions — no card required, no sleep-on-idle. See note in §2 |
| Frontend (Next.js) | [Vercel](https://vercel.com) | Hobby plan's ToS is scoped to non-commercial use — see note in §3 |
| Uptime monitoring | [UptimeRobot](https://uptimerobot.com) | Free plan checks every 5 min, alerts by email |
| Keep-alive ping | GitHub Actions (scheduled workflow) | Free, unlimited minutes on public repos |

Sign up for every service below using the dedicated GitHub account (or an email created for this project)
— not the developer's personal accounts.

---

## 1. Supabase — database, auth, storage

1. Create a new Supabase project.
2. Open **SQL Editor** and run, **in this exact order** (a fresh project starts empty — every one of
   these is required, not just the latest):
   - `schema.sql`
   - `migrations/0001_group_members_update_policy.sql`
   - `migrations/0002_atomic_event_registration.sql`
   - `migrations/0003_atomic_schedule_generation.sql`
   - `migrations/0004_atomic_mexicano_next_round.sql`
   - `migrations/0005_add_gender_field.sql`
   - `migrations/0006_atomic_event_withdrawal.sql`
   - `migrations/0007_fix_group_members_rls_recursion.sql`
   - `migrations/0008_platform_admin_and_group_suspension.sql`
   - `migrations/0009_avatars_storage_bucket.sql`
   - `migrations/0010_manual_registration_promotion.sql`
   - `migrations/0011_enable_realtime_for_live_scoring.sql`
3. **Authentication → Providers**: turn on **Confirm email** (rejects fake/typo'd email signups).
4. **Authentication → URL Configuration**: leave this open for now — it needs the production frontend
   URL, which doesn't exist until §3 is done. Come back to it in §4.
5. **Settings → API**: copy these three values, needed in §2 and §3:
   - `Project URL`
   - `anon` `public` key
   - `service_role` key — **secret**, backend-only, never exposed to the frontend

## 2. Backend — Vercel (Serverless Functions)

> **Why Vercel instead of Render:** live scoring used to run on self-hosted Socket.IO, which needs a host
> that keeps a persistent process alive — that's what Render's free tier was for. Live scoring has since
> moved to Supabase Realtime (Postgres Changes), so the backend is now a plain stateless REST API with no
> persistent-connection requirement at all, and can run as ordinary serverless functions. `backend/api/index.ts`
> exports the Express app as a single catch-all function; `backend/vercel.json` rewrites every request to
> it, so Express's own router still handles all the specific routes exactly as before. This also sidesteps
> Render's card-verification requirement entirely — Vercel's free tier needs no card on file.

1. New Project → import the repo.
2. **Root Directory**: `backend`. **Framework Preset**: "Other" (Vercel auto-detects the `api/` folder as
   Functions — no build command needed).
3. Environment variables:
   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | Project URL from §1.5 |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key from §1.5 |
   | `FRONTEND_URL` | placeholder for now — update after §3 (used for CORS) |
   | `NODE_ENV` | `production` |
4. Deploy, then note the domain Vercel assigns (e.g. `https://rally-hub-backend.vercel.app`).

## 3. Frontend — Vercel

> **ToS note:** Vercel's Hobby plan is scoped to non-commercial use. For a community club app with no
> in-app monetization this is generally understood to be within bounds, but it's the client's call to
> make, not a hard technical guarantee. If that's a concern, Cloudflare Pages is a genuinely
> unrestricted-for-commercial-use free alternative, at the cost of extra Next.js adapter setup
> (`@cloudflare/next-on-pages`).

1. New Project → import the forked repo.
2. **Root Directory**: `frontend` (Vercel auto-detects Next.js — no other config needed).
3. Environment variables:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from §1.5 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key from §1.5 |
   | `NEXT_PUBLIC_API_URL` | backend URL from §2.4 |
4. Deploy, then note the domain Vercel assigns (e.g. `https://rally-hub.vercel.app`).

## 4. Wire the two sides together

- **Backend Vercel project** → update `FRONTEND_URL` to the frontend's Vercel domain from §3.4, redeploy
  (backend's CORS allow-list reads this at startup).
- **Supabase** → **Authentication → URL Configuration**:
  - *Site URL*: the Vercel domain
  - *Redirect URLs*: add `https://<vercel-domain>/reset-password` (required for the forgot-password flow)

## 5. Bootstrap the first platform admin

There's no self-service way to become a platform admin — that's deliberate (see `AGENTS.md`). Once the
first real user (e.g. the client) has registered through the live site, run once in Supabase's SQL Editor:

```sql
insert into platform_admins (user_id) values ('<their auth.users id>');
```

Find the user id in **Authentication → Users**.

## 6. Keep-alive & monitoring

**Prevent Supabase's 7-day auto-pause** with a scheduled GitHub Actions workflow in the forked repo, e.g.
`.github/workflows/keep-alive.yml`:

```yaml
name: Keep Supabase awake
on:
  schedule:
    - cron: '0 3 * * 1,4' # Mondays and Thursdays, 03:00 UTC
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase REST endpoint
        run: curl -sf "${{ secrets.SUPABASE_URL }}/rest/v1/" -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}"
```

Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repo secrets (**Settings → Secrets and variables →
Actions**) before enabling this.

**Monitor uptime** by pointing UptimeRobot's free plan at `https://<backend-vercel-domain>/health` — it
emails an alert if the backend goes down, without anyone needing to watch it manually. Serverless functions
don't sleep-on-idle the way Render's free tier did, so this is a pure health check, not a wake-up ping.

## 7. End-to-end smoke test

Before handing the live URL to the client, verify on production (not localhost):

- [ ] Register a new account, confirm the verification email arrives
- [ ] Create a group, invite via link and via QR code, confirm the join-confirmation step works
- [ ] Create an event, register, generate a schedule
- [ ] Submit and confirm a match score
- [ ] Upload a profile avatar (exercises the `avatars` storage bucket from migration 0009)
- [ ] Trigger forgot-password, confirm the reset email arrives and the link works
- [ ] Promote a waitlisted player manually (migration 0010)

## 8. Optional: custom domain

A custom domain (~Rp150-200rb/**year**, not monthly) can be pointed at the frontend Vercel project for free
on Vercel's side — DNS setup is in Vercel's project settings. The backend Vercel project doesn't need a
custom domain; it's only called from the frontend, never visited directly by users.

---

## Shipping future changes

Both Vercel projects auto-deploy on every push to their configured Production Branch in the repo — no
manual redeploy step needed for routine code changes. New SQL migrations still need to be run manually in
Supabase's SQL Editor, same as in development.

## When free tier stops being enough

Realistic upgrade paths if this club/league outgrows the free tiers — none of these are needed at launch:

- **Supabase Pro** ($25/mo): removes the 7-day auto-pause, adds daily backups, raises storage/DB limits.
- **Vercel Pro** ($20/mo): removes any ambiguity around the commercial-use ToS clause, raises Functions
  execution limits.
