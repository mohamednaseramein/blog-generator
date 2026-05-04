---
id: AgDR-0025
timestamp: 2026-05-04T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ep-04-auth-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0025 — Role Model: Single `role` Column on Application `users` Table

> In the context of enforcing two distinct permission levels (`admin`, `user`) for EP-04, facing the choice between a single `role` column on the application `users` table, a separate `roles` join table, a full RBAC schema, or storing role in `auth.users.app_metadata`, I decided to use a **single `role` column with a CHECK constraint (`'admin' | 'user'`) on the application `users` table**, to achieve the simplest possible enforcement that fits the v1 product (binary operator-vs-customer split with no per-resource permissions), accepting the tradeoff that introducing a third role or any per-resource permission later requires a migration to a different model.

## Context

EP-04 ([epic #95](https://github.com/mohamednaseramein/blog-generator/issues/95)) introduces exactly two roles:

- **`user`** — default role; can manage their own blogs and own author profiles
- **`admin`** — operator; can manage other users (deactivate, force-reset, promote, demote), edit predefined author profiles, and view all blogs read-only

The user stories that depend on the role model:

- **US-AUTH-08, US-AUTH-09, US-AUTH-10** — admin endpoints gated by role
- **US-AUTH-11** — promote / demote (writes the role column on another row)
- **US-AUTH-08 AC5 / US-AUTH-11 AC4** — last-admin protection (a count-based invariant: at least one row with `role='admin' AND deactivated_at IS NULL`)
- **PRD § Edge Cases** — role promotion takes effect on next API call → the role must be read fresh from the row each request, not cached in the JWT

The PRD § Constraints pre-decides "single column"; this AgDR records the trade-off, the alternatives, and the upgrade path if v1's binary model proves insufficient.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Single `role` column on `users` (chosen)** | One column, one CHECK constraint, one read per request; `requireAdmin` middleware is `req.user.role === 'admin'` and nothing more; last-admin invariant is `SELECT COUNT(*) FROM users WHERE role='admin' AND deactivated_at IS NULL > 1`; trivial to test | Not extensible — adding a third role (`viewer`, `billing-admin`) is a migration; per-resource permissions (e.g. "can edit profile X") not expressible at all |
| Separate `roles` table + `user_roles` join | Each user can hold multiple roles; standard RBAC shape | Multi-role isn't needed in v1 — admin/user is exhaustive and mutually exclusive; adds two tables, one join, and re-introduces the question "is the user an admin?" as a JOIN on every protected request |
| Full RBAC: roles + permissions + role_permissions + user_roles | Maximum flexibility, ready for "Designer can edit profiles, Editor can read but not write blogs" etc. | 4-table schema, dramatic over-engineering for a binary operator/customer split; product has zero use case for fine-grained permissions in v1 (PRD § Non-Goals defers per-org tenancy entirely) |
| Role in `auth.users.app_metadata` (Supabase-native) | Avoids an extra column on our table; role lives where Supabase puts custom claims; can be read from the JWT without a DB hit | Couples role enforcement to the JWT — to invalidate a role change you'd need to revoke and re-issue the token (the PRD § Edge Cases explicitly wants role changes to take effect on next API call without forcing re-login); writes to `app_metadata` go through the Supabase Admin API not standard SQL — last-admin invariant becomes harder to enforce transactionally |
| Role on Postgres role-system / RLS policies | "Right" Postgres way; nice if we use Supabase RLS heavily | We don't use RLS for the API (backend uses `service_role` and enforces in middleware); duplicating the model in the DB role system adds a second source of truth; not justified |

## Decision

Chosen: **Single `role` column on the application `users` table.**

Schema (to be created in the cutover migration — see [AgDR-0026](./AgDR-0026-cutover-adopt-by-first-admin.md)):

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  email_verified_at TIMESTAMPTZ,
  deactivated_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Read pattern:**

- `requireAuth` middleware verifies the JWT (see [AgDR-0023](./AgDR-0023-session-supabase-js-default.md))
- A second middleware loads `SELECT id, role, email_verified_at, deactivated_at FROM users WHERE id = $1` and attaches it to `req.user`
- This is **one** lookup per request shared across the role check, the verification check ([AgDR-0024](./AgDR-0024-soft-verification-gate.md)), and the deactivation check
- `requireAdmin` checks `req.user.role === 'admin' && req.user.deactivated_at IS NULL`

**Write pattern:**

- Promote / demote: `UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`
- Last-admin protection: pre-write check `SELECT COUNT(*) FROM users WHERE role='admin' AND deactivated_at IS NULL >= 2` for any operation that would reduce the active-admin count. Backend enforces; UI mirrors as a defence-in-depth disabled state with tooltip.

## Consequences

- **The `requireAdmin` middleware is one line.** No JOINs, no second query, no permission-set evaluation. The simplest thing that works.
- **Role changes take effect on next API call** with zero token-revocation dance — exactly what the PRD § Edge Cases asks for. The JWT carries `user_id` only.
- **Last-admin protection is a single-query invariant** that's easy to wrap in a transaction with the demote / deactivate write — no race condition where two admins simultaneously demote each other.
- **Adding a third role later is a migration.** The CHECK constraint + the `'admin' | 'user'` enum in TypeScript both need updating. A single test that asserts the DB CHECK and the TS union match (similar to AgDR-0019's intent enum) catches drift.
- **Adding per-resource permissions later requires a model change**, not just a migration. If the product evolves to need "Designer can edit profiles X, Y, Z but not blogs", we will supersede this AgDR with a new RBAC AgDR. Acceptable — the PRD § Non-Goals explicitly defers per-org tenancy and any sub-role split.
- **`auth.users.app_metadata` is unused for role**, kept clean for any future Supabase-native concerns (e.g. RLS later).
- **The application `users` table** is the source of truth for `role`, `email_verified_at`, and `deactivated_at` — `auth.users` is the source of truth for `email_confirmed_at` and password material. We mirror `email_confirmed_at` → `email_verified_at` rather than reading it across tables, because the application table already has to be loaded for the role check, so we save the round trip.
- **Future supersession** would be triggered by: introduction of a third distinct role, requirement for per-resource permissions, or a product pivot to multi-tenant workspaces (which would also change the user-scoping model entirely).

## Artifacts

- Epic ticket: [mohamednaseramein/blog-generator#95](https://github.com/mohamednaseramein/blog-generator/issues/95)
- PRD: [`projects/blog-generator/prd-auth-ep04.md`](https://github.com/mohamednaseramein/apexyard/blob/main/projects/blog-generator/prd-auth-ep04.md) — see US-AUTH-08 through US-AUTH-11
- Related AgDRs: [AgDR-0023](./AgDR-0023-session-supabase-js-default.md) (session — feeds `req.user.id` to the role lookup), [AgDR-0024](./AgDR-0024-soft-verification-gate.md) (verification — same row, same lookup), [AgDR-0026](./AgDR-0026-cutover-adopt-by-first-admin.md) (cutover — creates this table)
