# Development Roadmap

This is the phased plan for everything remaining after the frontend↔backend wiring pass. It builds
directly on the gap analysis in [`USE_CASES.md`](./USE_CASES.md) (13 confirmed gaps, ✅/🟡/❌ per use
case) and the mechanics documented in [`WORKFLOWS.md`](./WORKFLOWS.md). See [`AGENTS.md`](../AGENTS.md)
for the non-negotiable rules every phase must respect, and [`PRD.md`](../PRD.md) for the product scope
and the still-open questions referenced below.

**Each phase below is a planning unit, not a ready-to-execute task list.** When a phase's turn comes up,
run a fresh plan-mode session for it — file-level detail should be derived from the code's state at that
time, not locked in here.

The single most important finding driving the phase order: **event registration — a feature that already
works end-to-end in code — is currently unreachable through the API at all.**
`POST /api/events/:id/register` (`backend/src/routes/events.routes.ts:154`) requires
`event.status === 'Open'`, but every event is created with the DB default `'Draft'`, and no endpoint
exists anywhere to change that status. Fixing this is Phase 1, not a side item.

**Standing decision:** testing and CI are deliberately pushed to Phase 7 (the very end) rather than
built incrementally, because the repo has no git remote yet and there's nowhere to run CI against. The
one exception is Phase 2 (scheduling engine), which ships its own correctness tests as part of the phase
— that risk is too expensive to defer.

---

## Track A — start now, outside of code, blocks nothing

**✅ Complete.** The `avatars` Storage bucket (`migrations/0009_avatars_storage_bucket.sql`) has been
created and applied to the live Supabase project — public bucket, 5MB limit, `image/jpeg`/`image/png`/
`image/webp` only, with `storage.objects` RLS restricting upload/update to a user's own
`{user_id}/...` folder (matching the path `frontend/src/app/profile/page.tsx` already constructs). Live
smoke-tested: upload into own folder succeeds, upload into another user's folder is rejected, unauthenticated
upload is rejected, and the resulting public URL is fetchable with the correct content type. UC-P4 in
[`USE_CASES.md`](./USE_CASES.md) is now ✅.

---

## Phase 1 — Admin Foundations & Core Correctness ✅ Complete

**Shipped:** all scope items below are implemented, type-checked, and verified end-to-end against the
live Supabase project (group settings edit, member promote/demote/remove, event status transitions with
enforced legal-transition map, organizer score override, and the `requireGroupRole()` middleware used
throughout). See [`USE_CASES.md`](./USE_CASES.md) for the per-use-case status (UC-O6, UC-O7, UC-GA5–8)
and [`WORKFLOWS.md`](./WORKFLOWS.md) §2.5–2.6, §3.4, §4.4 for the mechanics.

**Bonus fix found and closed during this phase:** `POST /api/events/:id/register` had no
group-membership check at all before this — any authenticated user who knew/guessed an event's UUID
could register for a group they weren't a member of. That's a real multi-tenant isolation leak per
AGENTS.md's non-negotiable rule, not just a Phase 1 nice-to-have; it's fixed now.

**Outstanding from this phase:** none. The `group_members` UPDATE RLS policy migration
(`padel-league/migrations/0001_group_members_update_policy.sql`) has been applied to the live Supabase
project (2026-08-10) — `group_members` now has defense-in-depth RLS coverage matching every other
admin-managed table, on top of the `supabaseAdmin` service-role bypass the endpoints already relied on.

**Bonus fix #2, found and closed after this phase (not Phase 1 scope, not a regression):** `POST
/api/events/:id/register` used to check the current registration count and then insert as two separate
non-atomic steps (`events.routes.ts`), a TOCTOU race that could let more than `max_players` players land
in `registered` status under concurrent requests. Fixed by moving the count-and-insert into a single
locked Postgres transaction — see the `register_for_event` function in
`padel-league/migrations/0002_atomic_event_registration.sql` and
[`WORKFLOWS.md`](./WORKFLOWS.md) §3.3 Gotcha #3. Applied to the live Supabase project (2026-08-10).

**Original scope (for reference):**
- Event status-transition endpoints (`Draft → Open → Full → In Progress → Completed → Cancelled`),
  gated to Organizer/Group Admin.
- A shared `requireGroupRole()` middleware, replacing the inline role checks currently duplicated across
  `groups.routes.ts`, `events.routes.ts`, and `matches.routes.ts`.
- Group member role management: promote/demote (Player ↔ Organizer), remove member. **Needs a new SQL
  migration** — `schema.sql` currently has INSERT and DELETE policies for `group_members` but **no
  UPDATE policy at all** (`schema.sql:251-279`); a role change would be silently denied by RLS without
  it.
- Group settings edit (name/description/public-private) — folded in here, same actor and route file as
  member management.
- **Organizer score-override endpoint** — deliberately pulled forward rather than bundled with
  scheduling: it's small, has no dependency on the scheduling engine, and closes a rule AGENTS.md calls
  non-negotiable ("Organizers can enter/correct scores directly as an override").

**Why bundled into one phase:** everything here is CRUD-shaped with low algorithmic risk, and all of it
is fundamentally "who's allowed to do what" — that foundation should exist before Phase 2 adds a lot more
surface area needing the same protection.

**Migration note:** `schema.sql` has already been run in full against the live Supabase project — don't
edit it in place again. Start using numbered migration files (e.g.
`padel-league/migrations/0001_group_members_update_policy.sql`) for every schema change from here on.

**Demoable outcome:** a Group Admin manages a real club (edit settings, manage member roles); an
Organizer takes an event from Draft → Open (players can now actually register) → ... → In Progress; an
Organizer can override a stuck score.

**Key files:** `backend/src/routes/events.routes.ts`, `groups.routes.ts`, `matches.routes.ts`,
`backend/src/middlewares/auth.middleware.ts` (where `requireGroupRole()` lands), a new migration file.

---

## Phase 2 — Scheduling Engine (highest technical risk, split in two)

The single largest gap in the app: there is zero code anywhere to generate a round/court schedule for
any of the 5 formats. An event created today never gets `matches` rows on its own.

### 2a — Static formats: Americano, Round Robin, Fixed Partner ✅ Complete

**Shipped:** `POST /api/events/:id/generate-schedule` (`backend/src/routes/schedule.routes.ts`), a pure
framework-free `backend/src/services/scheduling/` module (circle-method round-robin primitive, per-format
generators, physical-round packer, 30 Vitest unit tests), the atomic `generate_event_schedule` Postgres
function (`migrations/0003_atomic_schedule_generation.sql`, same locked-transaction pattern as
registration's migration 0002), a "Generate Schedule" button + `schedule:generated` Socket.IO broadcast on
the live event page. See [`WORKFLOWS.md`](./WORKFLOWS.md) §3.6 for the full mechanics and
[`USE_CASES.md`](./USE_CASES.md) UC-O2/UC-O3.

**Design decisions locked in during this phase's plan session** (deviating slightly from the original
scope note below): team formation for Fixed Partner/Round Robin is auto-pair-by-registration-order (no
partner-selection UI — `partner_user_id` remains unused); round counts are auto-computed, not
organizer-specified (no new `events` column); generation is manual (a button, decoupled from the
Open/Full → In Progress status transition) and **one-time only** — no regenerate endpoint exists, so a
mis-generated schedule currently needs a manual DB fix.

**Outstanding from this phase:** `migrations/0003_atomic_schedule_generation.sql` needs to be applied
manually in the Supabase SQL Editor, same as 0001/0002.

**Reuse:** the `matches` table shape and `broadcastLeaderboard`'s aggregation pattern
(`backend/src/sockets/socket.server.ts:41-71`, crediting each player on a team with that team's score)
already fit individual-scoring formats like Americano — the schema didn't need to change, the engine's
job was purely to populate `matches` rows correctly.

### 2b — Mexicano ✅ Complete · Mixed Partner ✅ Complete

**Mexicano shipped.** Pairing for round N+1 depends on round N's *confirmed* standings, so it's a
repeatable "generate next round" action (`POST /api/events/:id/generate-next-round`,
`backend/src/routes/schedule.routes.ts`) rather than a single upfront batch — round 1 reuses the existing
`generate-schedule` endpoint (empty history, everyone tied). Gated on every existing match being
`confirmed`; per the anticipated interaction, Phase 1's organizer override is the load-bearing escape
hatch for a stuck score blocking that gate (no confirmation timeout exists per AGENTS.md, so this is the
only way to unstick one). Atomic via a new `generate_next_mexicano_round` Postgres function
(`migrations/0004_atomic_mexicano_next_round.sql`) locking the event row, closing the same TOCTOU race
class as migrations 0002/0003. See [`WORKFLOWS.md`](./WORKFLOWS.md) §3.7 for full mechanics and
[`USE_CASES.md`](./USE_CASES.md) UC-O2/UC-P12.

**Design highlights from this phase's plan session** (a pressure-test round with a Plan agent caught real
issues before implementation, since incorporated): a Mexicano wave is capped to `courts_count × 4` active
players (benching the rest, chosen fairly by lowest prior sit-out count) rather than letting one wave spill
across multiple `round_number`s — keeps the confirmation gate a flat query; `sitOutCount` is computed
relative to each player's own `registered_at` so a mid-event joiner isn't wrongly treated as having sat out
waves before they even registered; a lightweight anti-repeat check flips a quartet's team split if the same
4 players would otherwise reproduce their immediately-preceding wave's exact pairing (satisfies PRD's
"avoid duplicate matchups when mathematically feasible" for a stable-leaderboard scenario). No round-count
cap — same "trust the organizer" precedent as Round Robin.

**Outstanding from this phase:** `migrations/0004_atomic_mexicano_next_round.sql` needs to be applied
manually in the Supabase SQL Editor, same as 0001-0003.

**Mixed Partner shipped as a follow-up session**, once the blocking product decision was made: gender is
**binary** (`Male`/`Female`, `migrations/0005_add_gender_field.sql` — nullable, self-declared, profile-edit
only, not collected at signup), registration for a Mixed Partner event is **blocked** until the player's
profile has it set (`events.routes.ts` `POST /:id/register` gate), teams are auto-paired by registration
order within each gender bucket (no partner-selection UI, same no-UI convention as Fixed Partner/Round
Robin), and an unequal Male/Female count **hard-rejects** schedule generation (400
`GENDER_RATIO_MISMATCH`) rather than excluding one player with a warning.

Mechanically, Mixed Partner is identical to Fixed Partner (fixed team all event, opponents rotate, rounds
clamped 3-8) — the only new code is gender-aware team formation
(`formMixedTeamsByRegistrationOrder()`, `services/scheduling/teams.ts`); `generateFixedPartnerLogicalRounds()`
and `packIntoPhysicalRounds()` are reused completely unchanged. Same architecture choice as Mexicano:
`services/scheduling/index.ts`'s dispatcher is untouched — handled directly in `schedule.routes.ts`. See
[`WORKFLOWS.md`](./WORKFLOWS.md) §3.8 and [`USE_CASES.md`](./USE_CASES.md) UC-O1/O2/O3, UC-P3, UC-P9.

**Outstanding from this phase:** `migrations/0005_add_gender_field.sql` needs to be applied manually in the
Supabase SQL Editor, same as 0001-0004.

**Tests were a required deliverable of this phase**, not deferred to Phase 7 — 8 new Vitest cases in
`backend/src/services/scheduling/mexicano.test.ts` (standings-driven grouping, court-capacity benching
fairness including the late-joiner regression, anti-duplicate-matchup override, insufficient-players) plus
3 new cases in `teams.test.ts` for `formMixedTeamsByRegistrationOrder` (balanced pairing, ratio mismatch,
missing gender), on top of the 42 total scheduling tests now passing.

**Key files:** `backend/src/services/scheduling/mexicano.ts` (new), `teams.ts` (+
`formMixedTeamsByRegistrationOrder`), `packer.ts` (gained an optional `startRoundNumber` param),
`backend/src/routes/schedule.routes.ts` (Mexicano + Mixed Partner branches, new generate-next-round
endpoint), `backend/src/routes/events.routes.ts` (Mixed Partner registration gate),
`frontend/src/app/profile/page.tsx` (gender field), `migrations/0004_atomic_mexicano_next_round.sql`,
`migrations/0005_add_gender_field.sql` (both new).

**Phase 2 is now fully complete — all 5 event formats can generate real matches.**

---

## Phase 3 — Waitlist: Withdraw + Auto-Promotion ✅ Complete

**Shipped:** `POST /api/events/:id/withdraw` (`backend/src/routes/events.routes.ts`, converted to the
`createEventsRouter(io)` factory pattern to gain Socket.IO access), backed by the atomic
`withdraw_from_event` Postgres function (`migrations/0006_atomic_event_withdrawal.sql`, same
lock-the-event-row-`FOR UPDATE` convention as migrations 0002-0004). A player can withdraw their own
registration any time the event is `Open`/`Full`/`In Progress`; if they were `registered` (not
`waiting_list`) and it's still before the promotion cutoff, the earliest waitlisted player is
auto-promoted in the same transaction. Broadcast as `registrations:updated` to the event's Socket.IO
room (full-array replace, same pattern as `schedule:generated`). See
[`WORKFLOWS.md`](./WORKFLOWS.md) §3.9 for full mechanics and [`USE_CASES.md`](./USE_CASES.md) UC-P11.

**Design decision resolved** (the one flagged as open in this section before implementation): promotion
after a schedule already exists **is always attempted**, regardless of format or whether `matches`
already exist for the event — a deliberate simplification over "only meaningful pre-generation." For
Mexicano this is free (each round re-fetches live registration state, §3.7); for the 4 static formats a
post-schedule promotion doesn't retroactively insert the player into any match (no regenerate endpoint
exists, a limitation already accepted in Phase 2a) — documented, not solved here.

**Promotion window** (PRD §4.1 "up until registration deadline / event start"): computed by the pure,
unit-tested `computePromotionCutoff()` (`backend/src/lib/promotionWindow.ts`) as
`MIN(registration_deadline, event_date + start_time)`, interpreted as Asia/Jakarta time. This is the one
piece of the feature with real Vitest coverage — the RPC and route themselves follow the established
"verified only via live Supabase smoke test" pattern already used for every other atomic function in this
app.

**WhatsApp hook removed:** a `TODO(Phase 4)` comment originally marked where a promotion notification
would be sent from the withdraw route. Once WhatsApp integration was descoped entirely (see Phase 4
below), that comment was deleted — auto-promotion is purely an in-app status change with no external
side effect.

**Scope boundary:** self-service withdrawal only — no organizer-initiated remove/manual-promote (that
remains UC-O5, unimplemented, a separate future item).

**Key files:** `migrations/0006_atomic_event_withdrawal.sql` (new), `backend/src/lib/promotionWindow.ts`
+ `.test.ts` (new), `backend/src/routes/events.routes.ts` (factory conversion + new route),
`backend/src/index.ts` (mounts `createEventsRouter(io)`), `frontend/src/app/events/[id]/live/page.tsx`
(withdraw button, confirm modal, socket listener).

---

## Phase 4 — WhatsApp Integration — ❌ Descoped

**Decision:** cancelled entirely, not deferred. The user chose to prioritize free-tier infrastructure over
a paid messaging API, so this phase will not be built. Nothing was ever implemented beyond the stub noted
in Phase 3 (now removed) — no functionality is lost, since score confirmation already runs fully in-app
(self-report by either player, confirmed by the other) and never actually depended on WhatsApp even while
this phase was still planned. Only the *notification* for waitlist promotion and the *external prompt* for
score confirmation are gone; both underlying flows work exactly as before.

Track A's "start Meta WhatsApp Business Account verification" item has been removed accordingly. See
`PRD.md` §4.2 and `AGENTS.md` for the corresponding scope-document updates.

---

## Phase 5 — Player Stats / Match History Persistence ✅ Complete

**Shipped:** `GET /api/players/me/stats` (`backend/src/routes/players.routes.ts`) — a player's own
aggregate stats (matches played, wins, losses, draws, total points, win rate) and full confirmed-match
history, computed across every group they've ever played in. See [`WORKFLOWS.md`](./WORKFLOWS.md) §6 for
full mechanics and [`USE_CASES.md`](./USE_CASES.md) UC-P17.

**Design deviation from the scope note below (deliberate):** no `player_stats` table and no migration at
all — stats are computed on-the-fly from the existing `matches` table on every request, the same
recompute-don't-persist precedent already established by the live in-event leaderboard
(`broadcastLeaderboard`). A persisted table would need correct increment/decrement logic every time an
Organizer re-overrides an already-`confirmed` match (possible at any time per §4.4), for a query-speed
benefit that doesn't matter at this app's per-club data scale — confirmed as the right tradeoff during
this phase's plan session.

**Also discovered during this phase:** the PRD requirement "results are viewable by all group members
after the event closes" was **already satisfied** before this phase — the live event page's "Klasemen"
tab has no status gating and already renders correctly for `Completed` events. This phase is purely the
cross-group *personal* view (stats + history), not per-event results.

**Self-scoped only, no `requireGroupRole` needed:** since the query predicate always pins to the caller's
own `user_id`, a player's history spanning many groups can never expose another player's data — a rare
case in this app where an endpoint's authorization is simpler than the default per-group pattern, not
weaker.

**UI split** (per this phase's plan session): quick summary cards (wins, points) on the Dashboard's
existing "Quick Stats" grid; the full match-by-match history table only on the Profile page, in a new
section below the existing edit form.

**Key files:** `backend/src/routes/players.routes.ts` (new), `backend/src/index.ts` (mounts
`playersRouter`), `frontend/src/app/dashboard/page.tsx` (2 new Quick Stats cards),
`frontend/src/app/profile/page.tsx` (new stats + match history section).

---

## Phase 6 — Guest Public Discovery + Platform Admin ✅ Complete

**Both open PRD questions resolved during this phase's plan session:** §7.3 → build a real public
directory (not invite-only-only); §7.4 → Platform Admin scoped minimally to read-only + suspend/unsuspend
a group, no broader permission system, no content edits, no override of other Group Admin decisions.

**Guest Public Discovery shipped:** `GET /api/public/groups` / `GET /api/public/groups/:id`
(`backend/src/routes/public.routes.ts`, deliberately the only unauthenticated routes besides `GET
/health`) → `/discover` and `/discover/[id]` (new top-level frontend routes, not nested under `/groups`
to keep the member-only pages there completely untouched). `groups.is_public` — present since the
original schema but functionally inert until now — finally does something. Guest can view only, never
join, per PRD §3's literal wording; the existing invite-code join flow is completely unchanged. See
[`WORKFLOWS.md`](./WORKFLOWS.md) §7 and [`USE_CASES.md`](./USE_CASES.md) UC-G1/UC-G2.

**Platform Admin shipped:** a new `platform_admins` table (`migrations/0008_...`, deliberately separate
from `profiles` — a column there would have been self-promotable given the existing "update own" RLS
policy has no column-level `WITH CHECK`), gated by a new `requirePlatformAdmin` middleware and granted
only via manual SQL `INSERT` (no self-service path, by design). `GET /api/admin/groups`/`/users`
(read-only) and `PATCH /api/admin/groups/:id/suspend`/`/unsuspend` → `/admin` (frontend, direct-URL-only,
no nav link, gated purely by the API's 403 response). See [`WORKFLOWS.md`](./WORKFLOWS.md) §8 and
[`USE_CASES.md`](./USE_CASES.md) UC-PA1/PA2/PA4.

**Suspension is a full lockout, enforced from one central choke point** — a small addition to
`requireGroupRole()` itself (`rbac.middleware.ts`), which nearly every group/event/match route already
uses, so registration/scheduling/scoring/member-management are all covered by one change. The one gap
found during plan review — `POST /api/groups/join/:invite_code` doesn't go through `requireGroupRole`
(caller isn't a member yet) — got its own explicit inline check instead.

**Key files:** `migrations/0008_platform_admin_and_group_suspension.sql`,
`backend/src/middlewares/admin.middleware.ts` (new), `backend/src/routes/admin.routes.ts` (new),
`backend/src/routes/public.routes.ts` (new), `backend/src/middlewares/rbac.middleware.ts` (suspension
check), `backend/src/routes/groups.routes.ts` (join-endpoint suspend gate, `suspended_at` surfaced in
`GET /`), `frontend/src/app/discover/page.tsx` + `[id]/page.tsx` (new), `frontend/src/app/admin/page.tsx`
(new).

**Addendum (post-Phase 6) — join confirmation step:** the invite-link/QR-code join flow
(`POST /api/groups/join/:invite_code`, touched above for the suspend gate) previously auto-joined the
caller the instant `frontend/src/app/groups/join/[code]/page.tsx` loaded, with no confirmation step. A new
read-only `GET /api/groups/join/:invite_code/preview` endpoint now sits in front of it — the invitee sees
the group's name/description/member count (and an inline "already a member" or "suspended" state) and must
explicitly click "Gabung" before the existing join endpoint is actually called. No schema change; the join
endpoint itself is unchanged. See [`WORKFLOWS.md`](./WORKFLOWS.md) §2.4.

**Addendum (pre-Phase 7) — small recorded gaps closed:** four `USE_CASES.md` items closed in one batch
before starting Phase 7, none requiring a new phase or an open design decision:
- **UC-P10** — waiting-list position is now computed server-side (`attachWaitingListPosition()`,
  `backend/src/routes/events.routes.ts`) instead of only client-side.
- **UC-O5** — Organizer can now manually promote a *specific* waiting-list registration
  (`POST /api/events/:id/registrations/:registrationId/promote`, `migrations/0010_...`), capacity still
  enforced with no override, distinct from withdraw's automatic earliest-in-queue promotion (Phase 3).
- **UC-GA3** — the group invite QR code is now a real, scannable code (`qrcode.react`) instead of a
  decorative placeholder SVG.
- **Forgot Password** (not previously tracked as a use case at all, despite PRD §4.1 listing it in MVP
  scope) — `frontend/src/app/forgot-password/page.tsx` + `frontend/src/app/reset-password/page.tsx`,
  pure Supabase Auth (`resetPasswordForEmail` / `updateUser`), no backend route needed.

Deliberately excluded from this batch: UC-PA3 (dispute moderation) and UC-PA5 (platform settings) —
both are unresolved open questions (PRD §7.4 / no concrete scope at all), not small implementation gaps.
See [`WORKFLOWS.md`](./WORKFLOWS.md) §1.5 and §3.5 for mechanics.

---

## Phase 7 — Hardening ✅ Complete (minus CI/CD, explicitly deferred)

**Shipped:**
- **Test runner.** `backend/vitest.config.ts` now also covers `src/middlewares/**/*.test.ts` (previously
  only `services/scheduling/**` and `lib/**`). Total 62 tests (up from 47): the pre-existing 42 scheduling
  + 5 `promotionWindow` tests, plus 7 new tests for the event status-transition matrix
  (`backend/src/lib/eventStatus.ts` — `ALLOWED_TRANSITIONS`/`isValidStatusTransition` extracted out of
  `events.routes.ts`, same "pure function in `lib/`" pattern as `promotionWindow.ts`, so it's unit-tested
  without touching Supabase) and 8 new tests for RBAC middleware (`requireGroupRole`,
  `requirePlatformAdmin` — mocked via `vi.mock('../lib/supabase')`, covering allowed-role, wrong-role,
  non-member, suspended-group, unresolvable-group-id, and event-lookup-miss branches).
- **OpenAPI/Swagger docs.** New `backend/src/openapi.ts` registers all 28 routes across all 7 route
  files with `@asteasolutions/zod-to-openapi` — the 3 files with existing Zod schemas (`events`, `groups`,
  `matches`) get their request bodies generated directly from those schemas (now exported, some hoisted
  out of factory functions to module scope so they're importable); the 4 files without Zod schemas
  (`admin`, `schedule`, `players`, `public` — confirmed via grep to take no request body at all) are
  documented manually with the same level of detail. Served at `GET /api/docs` (interactive Swagger UI)
  and `GET /api/openapi.json` (raw spec), both mounted in `backend/src/index.ts`.
- **Tech debt cleanup.** `createSupabaseUserClient()` deleted entirely from `backend/src/lib/supabase.ts`
  (confirmed dead code — zero call sites anywhere in the app — with a doc comment that wrongly claimed
  RLS enforcement while still using the service-role key; deleting was more honest than "fixing" an
  unused function). `backend/package.json`'s `@supabase/supabase-js` bumped from `^2.39.0` to `^2.112.2`
  to match what both lockfiles already resolved to (cosmetic only, no functional drift existed).

**Deferred, by explicit user decision:** CI/CD (GitHub Actions). This repo has never been `git init`'d —
confirmed via `git rev-parse --is-inside-work-tree` failing — so there's no remote to run a pipeline
against yet. Revisit once a GitHub repo exists; nothing else in this phase depends on it.

---

## Deliberately not a separate phase

- **Group settings edit** — folded into Phase 1 (same actor, same route file as member management).
- **Centralized RBAC middleware** — not deferred hardening, it's a core Phase 1 deliverable (needs to
  exist before later phases add more routes that would otherwise need retrofitting).
- **Avatar bucket** — not a phase, handled now in Track A.

---

## Keeping this current

Update [`USE_CASES.md`](./USE_CASES.md)'s ✅/🟡/❌ statuses and [`WORKFLOWS.md`](./WORKFLOWS.md)'s
mechanics whenever a phase ships — those two documents are the objective measure of what's actually
"done and usable," not just "code was written." **Phase 4 (WhatsApp) has been descoped, not deferred** —
cancelled by user decision to keep V1 on free-tier infrastructure only; it will not be built. **Phases
1-3, 5, 6, and 7 are all complete** (plus the post-Phase-6 join-confirmation and pre-Phase-7 gap-batch
addenda). The only thing left in the whole roadmap is CI/CD, explicitly deferred inside Phase 7 until
this repo has a git remote to run a pipeline against.
