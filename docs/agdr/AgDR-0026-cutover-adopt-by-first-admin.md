---
id: AgDR-0026
timestamp: 2026-05-04T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ep-04-auth-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0026 — Cutover Strategy: Adopt Existing Dev Data Under First Admin

> In the context of replacing the placeholder dev-user UUID `00000000-0000-0000-0000-000000000001` with real authenticated accounts in EP-04, facing the choice between adopting the existing rows under a designated first admin, deleting all pre-cutover data, splitting it across multiple owners manually, or orphaning it for later reassignment, I decided to **adopt all pre-cutover blogs and custom author profiles under the first admin** (Mohamed Naser, `mnaser.tech@gmail.com`) via a SQL migration that creates the `users` table and adds FKs, paired with a TypeScript seeder script `scripts/seed-first-admin.ts` that creates the auth user and runs idempotent UPDATEs, to achieve zero data loss for existing dev content with a clean foreign-key-enforced state post-cutover, accepting the tradeoff that the first admin starts with all historical content attributed to them and that we have to operate two coordinated artefacts (SQL migration + TS seeder) for one logical change.

## Context

The blog-generator has been operating since EP-01 with a single hardcoded dev-user UUID across every owned row:

- `blogs.user_id = '00000000-0000-0000-0000-000000000001'`
- `author_profiles.user_id = '00000000-0000-0000-0000-000000000001'` (for non-predefined rows)

The placeholder UUID does not correspond to any `auth.users` row and there is no `users` application table. EP-04 needs to:

1. Create the `users` table (see [AgDR-0025](./AgDR-0025-role-column-vs-table.md))
2. Move every placeholder-UUID row to a real authenticated user
3. Add foreign-key constraints so future rows can't carry a dangling `user_id`
4. Designate the first admin so admin endpoints are usable on day one

The PRD ([`prd-auth-ep04.md`](https://github.com/mohamednaseramein/apexyard/blob/main/projects/blog-generator/prd-auth-ep04.md)) § US-AUTH-12 specifies the acceptance criteria; this AgDR records the strategic choice (adopt vs. alternatives) and the SQL-migration-vs-seeder split.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Adopt under first admin (chosen)** | Zero data loss for the operator's own dev content; first admin walks into a populated dashboard on day one (good demo posture); idempotent — re-running matches no rows the second time; clean FK-enforced state post-migration | First admin's account ends up with every pre-cutover blog regardless of who created it during dev; reversal requires the documented rollback (re-stamp the placeholder UUID, drop the FK) |
| Delete all pre-cutover data | Trivial migration — `DELETE FROM blogs WHERE user_id = '…-001'` | Loses real work; demo content disappears; no recovery path; PRD § Non-Goals doesn't ask for this |
| Split data across multiple users manually | Most accurate to "real" ownership if multiple devs contributed | We have no record of who actually authored each row — `created_at` doesn't tell us; would require manual annotation per row before migration; high effort, low payoff for v1 |
| Orphan rows (allow NULL user_id, reassign later via UI) | Cleanest separation between "data" and "ownership"; no auto-attribution | Breaks the FK guarantee we want; introduces a long tail of orphaned rows that would never get reassigned in practice; the admin UI to reassign doesn't exist and isn't planned |
| Drop the placeholder column entirely, recompute ownership later | Fresh start | Same problems as deletion — we lose dev content; no upside |

## Decision

Chosen: **Adopt under first admin**, split into two coordinated artefacts:

### Artefact 1 — SQL migration (Postgres)

Idempotent, runs in transaction, applied via the project's standard migration tooling:

1. `CREATE TABLE users (...)` — schema per [AgDR-0025](./AgDR-0025-role-column-vs-table.md)
2. (No FKs yet — they're added in step 5 of the seeder, after data is reassigned)
3. Verification check: `SELECT 1` — migration is structural only at this stage

### Artefact 2 — TypeScript seeder `scripts/seed-first-admin.ts`

Run **once** per environment, after the SQL migration. Reads `FIRST_ADMIN_EMAIL` from env (defaults to `mnaser.tech@gmail.com` for the operator). Steps:

1. **Idempotent auth-user creation** via Supabase Admin API:
   - If `auth.users` already has a row with `FIRST_ADMIN_EMAIL`, use its `id`
   - Otherwise call `supabase.auth.admin.createUser({ email, email_confirm: true, password: <generated-or-prompted> })`
2. Insert into `users`: `INSERT … ON CONFLICT (id) DO NOTHING` with `role='admin'`, `email_verified_at = NOW()`
3. Reassign placeholder UUIDs:
   - `UPDATE blogs SET user_id = $admin_id WHERE user_id = '00000000-0000-0000-0000-000000000001'`
   - `UPDATE author_profiles SET user_id = $admin_id WHERE user_id = '00000000-0000-0000-0000-000000000001'` (non-predefined only — predefined rows have a different ownership semantics, see existing seed scripts)
4. Add foreign keys (idempotent — guarded by `IF NOT EXISTS` check):
   - `ALTER TABLE blogs ADD CONSTRAINT fk_blogs_user FOREIGN KEY (user_id) REFERENCES users(id)`
   - `ALTER TABLE author_profiles ADD CONSTRAINT fk_author_profiles_user FOREIGN KEY (user_id) REFERENCES users(id)`
5. Verify: `SELECT COUNT(*) FROM blogs WHERE user_id = '00000000-…-001'` must return 0; same for `author_profiles`. Abort with non-zero exit if not.

### Why split SQL migration + TS seeder?

Three reasons:

1. **The auth user creation requires the Supabase Admin API**, which is a JS-only path. SQL alone can't talk to `auth.users` because that schema is owned by Supabase and the only safe creation path is the Admin SDK.
2. **Migrations should be deterministic and runnable in any environment without side effects.** Creating an auth user is a side effect (it provisions an external identity); keeping that out of the migration tool's tree means staging / prod deployments don't accidentally re-run it.
3. **Rollback is per-artefact:** the SQL migration is rolled back via the migration tool; the seeder's effects (auth user existence, populated `users` row, reassigned UUIDs) are reversed via a separate documented runbook (see Consequences).

## Consequences

- **First admin starts with all historical content.** Acceptable because the operator (Mohamed Naser) authored or is responsible for the existing dev content. Future admins promoted via US-AUTH-11 do not retroactively get any content — they start with their own scope.
- **Two artefacts, one logical change** — the migration ticket created via `/migration` (per Workflow Gate 3a) bundles both, and the migration AgDR (separate from this strategic AgDR) documents the runbook.
- **Idempotency on both sides:**
  - SQL migration: `CREATE TABLE … IF NOT EXISTS` — re-running is a no-op
  - Seeder: every step is `WHERE … = placeholder` or `ON CONFLICT DO NOTHING` — re-running matches zero rows on the second pass
- **Production launch blocker** (PRD § Open Questions): the production redirect URL must be configured in Supabase before the seeder runs in prod, otherwise the auth-user-creation step will succeed but verification / reset emails will point to a dev URL. Treated as a hard blocker on the prod cutover step in the PRD § Timeline.
- **Rollback runbook** (to be expanded in the migration AgDR, not duplicated here):
  1. Re-stamp the placeholder UUID: `UPDATE blogs SET user_id = '00000000-…-001' WHERE user_id = $admin_id` (and same for `author_profiles`) — only safe if no other users have created content yet
  2. `DROP CONSTRAINT fk_blogs_user; DROP CONSTRAINT fk_author_profiles_user;`
  3. `DELETE FROM users WHERE id = $admin_id; DROP TABLE users;`
  4. Optionally remove the auth user via the Supabase Admin API (`auth.admin.deleteUser`)
- **First-admin password generation:** the seeder either generates a random password and prints it once (CLI-friendly, operator copies it) or accepts `FIRST_ADMIN_PASSWORD` from env (CI/staging). Tech-design phase decides which mode is the default; this AgDR is agnostic.
- **Predefined author profiles are untouched.** They are seeded by existing scripts and have their own ownership semantics (no `user_id`, or a sentinel system user, depending on AgDR-0020 / existing seed). The cutover seeder explicitly excludes them from the UPDATE.
- **Pre-cutover blog data is now visible to the first admin** in the admin audit view (US-AUTH-10). This is a feature, not a bug — admins seeing pre-cutover content is exactly what "adopt" means.
- **Future supersession** would be triggered by: a need to retroactively reassign content to multiple users (would require an admin-only "reassign blog ownership" feature first), or a regulatory requirement to delete all dev data before launch.

## Artifacts

- Epic ticket: [mohamednaseramein/blog-generator#95](https://github.com/mohamednaseramein/blog-generator/issues/95)
- PRD: [`projects/blog-generator/prd-auth-ep04.md`](https://github.com/mohamednaseramein/apexyard/blob/main/projects/blog-generator/prd-auth-ep04.md) — see US-AUTH-12 for the AC-level detail
- Related AgDRs: [AgDR-0021](./AgDR-0021-auth-provider-supabase.md) (auth provider — Admin API used in the seeder), [AgDR-0025](./AgDR-0025-role-column-vs-table.md) (`users` table schema), [AgDR-0024](./AgDR-0024-soft-verification-gate.md) (first admin gets `email_verified_at = NOW()` so the gate doesn't trip on day one)
- Migration ticket + migration AgDR: TBD — to be created via `/migration` once the cutover work is scoped (Workflow Gate 3a)
- Seeder script path: `scripts/seed-first-admin.ts` (to be added during the Build phase)
