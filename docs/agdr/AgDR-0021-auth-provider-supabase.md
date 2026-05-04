---
id: AgDR-0021
timestamp: 2026-05-04T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ep-04-auth-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0021 — Auth Provider: Supabase Auth

> In the context of replacing the placeholder dev-user UUID with real accounts in EP-04, facing the choice between Supabase Auth, Auth0, Clerk, NextAuth, or a custom implementation, I decided to use **Supabase Auth**, to achieve email/password registration, verification, password reset, and JWT issuance with zero new vendor onboarding and a database-native role layer, accepting the tradeoff that we are coupled to Supabase's auth UX, rate limits, and email-template constraints rather than a best-of-breed auth specialist.

## Context

EP-04 ([epic #95](https://github.com/mohamednaseramein/blog-generator/issues/95)) replaces the hardcoded dev-user UUID `00000000-0000-0000-0000-000000000001` with real authenticated accounts. The product needs:

- Email/password registration with verification
- Login and per-device logout
- Forgot-password and reset-password flows
- JWT-based session for the SPA frontend → Express backend
- A role layer (`admin` | `user`) enforced at the API boundary
- A clean cutover that adopts existing dev rows under the first admin

The blog-generator already uses Supabase as its database client (see [AgDR-0003 — Supabase Database Client](./AgDR-0003-supabase-database-client.md)). The `@supabase/supabase-js` SDK is already installed in `backend/package.json`, the `auth.users` schema exists in our Supabase project, and the database connection is configured. Adding Supabase Auth means turning on a feature in the same project we already pay for, not onboarding a new vendor.

The PRD ([`prd-auth-ep04.md`](https://github.com/mohamednaseramein/apexyard/blob/main/projects/blog-generator/prd-auth-ep04.md)) sets the constraint that auth provider is pre-decided as Supabase Auth. This AgDR records the trade-off for future reference.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Supabase Auth (chosen)** | Already in the stack (`@supabase/supabase-js`, same project); `auth.users` lives in the same Postgres so FKs from our app `users` table are trivial; no new vendor; bcrypt + JWT + email flows handled; free tier covers v1 traffic; RLS-compatible if we want to layer it later | Locked into Supabase's email-template UX and rate-limit knobs; less polished pre-built UI than Clerk; custom flows (e.g. magic-link, MFA) require Supabase support adding them; coupling deepens our exit cost from Supabase |
| Auth0 | Mature, OWASP-audited, rich admin UI, MFA / SSO ready | Adds a second vendor, second bill (~$25/mo at the lowest meaningful tier), separate user store from our Postgres → either sync nightmare or we treat Auth0 as source-of-truth and lose FK ergonomics; large SDK; over-engineered for an email/password v1 |
| Clerk | Best-in-class drop-in UI, generous free tier, modern DX, strong session model | Same data-locality problem as Auth0 (user store outside our Postgres); pricing scales with MAU not flat; would force us to use their `<SignIn />` components or rebuild — couples our frontend to their components or back to a thin wrapper anyway |
| NextAuth.js / Auth.js | Open source, code-only, no vendor lock-in | Requires us to host and operate the email-sending side, manage the password-hashing parameters, write the verification token store, and run the migrations — re-implementing what Supabase Auth already gives us; CSRF and session-fixation are our problem to get right |
| Custom (own bcrypt + JWT + email) | Maximum control, no vendor at all | All of NextAuth's downsides plus we own every CVE, every reset-token edge case, every rate-limit bug; security-critical greenfield code is the worst place to optimise for control over speed |

## Decision

Chosen: **Supabase Auth**, because:

1. **Zero new vendor onboarding.** The Supabase project, `auth.users` schema, and SDK are already integrated (AgDR-0003).
2. **Database-local user identity.** `auth.users.id` is a Postgres UUID in the same database as `blogs`, `author_profiles`, etc. Our app `users` table can `REFERENCES auth.users(id)` directly — no cross-system sync.
3. **Bundled email flows.** Verification, forgot-password, reset, and resend are first-class features; we wire them up rather than build them.
4. **Reuses the JWT infrastructure** the SPA already understands implicitly via `@supabase/supabase-js`. The backend verifies the JWT per request using Supabase's `jwt.verify` (or the SDK's `auth.getUser(jwt)` admin helper).
5. **Cutover is straightforward** because the auth user and the app user share a UUID — the seeder script (`scripts/seed-first-admin.ts`) creates the auth user via the Admin API, then references that UUID in the application `users` row and in all reassigned `blogs.user_id` / `author_profiles.user_id` updates.

## Consequences

- **Supabase project configuration required** before implementation (operator action, captured in PRD § Dependencies):
  - Enable the **Email** auth provider
  - Configure Custom SMTP (Mailtrap — see [AgDR-0022](./AgDR-0022-email-transport-mailtrap.md))
  - Set Site URL and redirect allowlist (`http://localhost:5173/*` for dev; production URL is a launch blocker)
- **Backend** uses `@supabase/supabase-js` for auth flows on the public API and the `service_role` client for admin actions (e.g. seeder script, admin user-management endpoints).
- **`requireAuth` middleware** (currently a placeholder, see [`technical-design-ep01.md`](https://github.com/mohamednaseramein/apexyard/blob/main/projects/ai-blog-generator/technical-design-ep01.md)) is replaced with a real implementation that calls `supabase.auth.getUser(token)` and attaches `req.user` from the verified JWT.
- **Application `users` table** is added with FK to `auth.users.id`, plus role / email_verified_at / deactivated_at columns. Cutover migration handles this; see [AgDR-0026 — Cutover by First Admin](./AgDR-0026-cutover-adopt-by-first-admin.md).
- **Rate limits** default to Supabase's settings (no application-layer overrides in v1) — recorded here rather than as a separate AgDR per the PRD's § Constraints note.
- **Coupling to Supabase deepens.** Migrating off Supabase later would now mean migrating the database **and** the auth provider together. Acceptable v1 trade-off — the PRD is explicit about not re-litigating this.
- **MFA, magic-link, OAuth providers** are out of scope for v1 (PRD § Non-Goals). When we add them, Supabase Auth supports all three natively and no AgDR-0021 supersession is required.
- **Future supersession** would only be triggered by: Supabase pricing change that breaks our economics, a Supabase Auth incident severe enough to lose trust, or a product pivot that makes us need a feature Supabase doesn't ship.

## Artifacts

- Epic ticket: [mohamednaseramein/blog-generator#95](https://github.com/mohamednaseramein/blog-generator/issues/95)
- PRD: [`projects/blog-generator/prd-auth-ep04.md`](https://github.com/mohamednaseramein/apexyard/blob/main/projects/blog-generator/prd-auth-ep04.md)
- Related AgDRs: [AgDR-0003](./AgDR-0003-supabase-database-client.md) (database client), [AgDR-0022](./AgDR-0022-email-transport-mailtrap.md) (email transport), [AgDR-0023](./AgDR-0023-session-supabase-js-default.md) (session model), [AgDR-0026](./AgDR-0026-cutover-adopt-by-first-admin.md) (cutover)
- Tech design: TBD — `projects/blog-generator/technical-design-ep04-auth.md` to be drafted next phase
