---
id: AgDR-0023
timestamp: 2026-05-04T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ep-04-auth-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0023 — Session Model: `@supabase/supabase-js` Default (localStorage + Server JWT Verify)

> In the context of holding the authenticated session between the SPA frontend and the Express backend in EP-04, facing the choice between the Supabase SDK's default localStorage strategy, httpOnly cookies, a custom JWT in a custom store, or a server-side session table, I decided to **use `@supabase/supabase-js`'s default session storage** (token persisted in localStorage, sent as `Authorization: Bearer …`, verified server-side per request via Supabase's JWT helpers) to achieve the lowest implementation cost and full alignment with the rest of the SDK's flows, accepting the tradeoff that localStorage is reachable from JavaScript and therefore exposed to XSS — which we mitigate at the application layer (CSP, framework defaults, output encoding) rather than at the storage layer.

## Context

The product is an SPA (Vite + React) talking to an Express backend over the same origin in dev (`localhost:5173` → `localhost:3000`) and over a TBD production domain. EP-04 needs a session that:

- Survives page reload (so users don't re-login on every refresh)
- Carries enough identity to authenticate the user on every API call (`req.user.id` available in handlers)
- Supports per-device logout (US-AUTH-06)
- Allows global session revocation when an admin force-resets a user (US-AUTH-08 AC3) or when a user resets their own password (US-AUTH-05 AC2)
- Returns 401 on the next API call when an admin deactivates a user (US-AUTH-03 AC6 / US-AUTH-08 AC2)

Supabase issues a JWT signed with the project's JWT secret. The SDK ships with built-in session storage and refresh-token handling — by default it persists the access token + refresh token in `localStorage` and auto-refreshes on expiry. The PRD § Constraints pre-decides this approach.

The "Remember me" toggle on the login form (US-AUTH-03 AC1) maps to the SDK's `persistSession` option (default true → 30-day refresh token lifetime; false → session-only).

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **`@supabase/supabase-js` default (localStorage + Bearer token, chosen)** | Zero custom code — the SDK already does it; auto-refresh, expiry, multi-tab sync all handled; admin-API revocation works out of the box; "Remember me" maps cleanly to `persistSession`; backend verification is one SDK call (`supabase.auth.getUser(token)`) | localStorage is reachable from any script in the page → XSS yields token exfiltration; mitigation lives at the app layer (CSP, React's default escaping, audit dependencies) |
| httpOnly cookies (custom-issued) | Token unreachable from JS, mitigates XSS-driven theft | Defeats Supabase SDK's session model — we'd manually issue, sign, store, refresh, and revoke; cross-origin setup (SameSite, CORS credentials) becomes a permanent maintenance burden; we'd lose `supabase.auth.signInWithPassword` ergonomics or be running two parallel session systems |
| Custom JWT, our own signing, our own store | Full control over claims, expiry, revocation strategy | Re-implements what Supabase Auth already gives us; key rotation, refresh rotation, replay protection all become our problem; "least secure thing the team writes from scratch" risk |
| Server-side session table (opaque session id) | Easy server-side revocation (just delete the row), no token-in-storage exposure | Adds a DB read on every request; loses Supabase's pre-built integration; v1 has no scaling pressure that justifies this complexity |
| Hybrid: SDK for auth flows + cookies for transport | Could in theory get the best of both | Two systems to keep in sync; bug surface; nobody on the team has done it; not justified by v1 threat model |

## Decision

Chosen: **`@supabase/supabase-js` default**.

| Concern | Mechanism |
|---|---|
| Where the access token lives | `localStorage` (SDK default), key namespaced by Supabase project ref |
| Where the refresh token lives | Same — SDK manages both |
| Token transport to backend | `Authorization: Bearer <access_token>` header, set automatically when frontend code uses the SDK's fetch wrapper or manually for our Express endpoints |
| Backend verification | `supabase.auth.getUser(token)` (or `jwt.verify` against the project's JWT secret if we want to skip a network round-trip — choice is a tech-design detail, not an AgDR-level decision) |
| Token expiry | 1 hour (Supabase default) — refresh token used silently to mint a new access token |
| Refresh token expiry | 30 days when `persistSession: true`, ~1 hour when `persistSession: false` (effectively session-only) |
| "Remember me" toggle | `persistSession: false` when unchecked; default `true` otherwise |
| Logout (per-device) | `supabase.auth.signOut()` clears localStorage + revokes refresh token at Supabase |
| Global session revocation | Supabase Admin API: `auth.admin.signOut(userId)` invalidates all refresh tokens; access tokens still valid until expiry — accepted because the role/deactivation check on every request closes the gap (next call returns 401) |
| Deactivation propagation | Backend reads `users.deactivated_at` per request (already in PRD § Constraints); a still-valid access token from a deactivated user gets 401 on the very next API call, so propagation latency ≤ access-token TTL |

## Consequences

- **XSS is the threat model that matters.** Storing tokens in localStorage means any successful XSS in the SPA leaks the session. Mitigations at the app layer — none of which is part of EP-04's scope but all of which are now mandatory companions to this AgDR:
  - Content Security Policy with no `unsafe-inline` script src
  - React's default JSX escaping (no `dangerouslySetInnerHTML` on auth-adjacent surfaces)
  - Dependency audit on auth pages (existing `/audit-deps` workflow)
  - Sanitisation of any user content that could land in the DOM (e.g. blog drafts rendered to HTML — already handled by the markdown pipeline, but worth checking under this lens)
- **No httpOnly cookies anywhere in the auth path.** This is a deliberate, recorded choice — future Tech Leads should not switch transport without superseding this AgDR.
- **CORS configuration** in production must allow `Authorization` header from the frontend origin and not require `credentials: 'include'` (no cookies → no credentialed CORS needed).
- **Multi-tab sync** is handled by the SDK — logout in one tab signs out in the others on next interaction.
- **Stale role after promotion / demotion** is intentionally accepted (PRD § Edge Cases): the JWT carries `user_id` only; `role` is read fresh from the application `users` table per request. Promotion takes effect on next API call. No JWT-claim invalidation needed.
- **MFA, session-fixation defences, and device-trust signals** are not addressed here. PRD § Non-Goals defers MFA. Session fixation is mitigated by Supabase's refresh-token rotation (a refresh token is single-use; using it issues a new pair).
- **Future supersession** would be triggered by: an XSS incident in the product, regulated-data requirements (HIPAA, PCI) that mandate httpOnly cookies, or a user-base shift that changes the threat model materially.

## Artifacts

- Epic ticket: [mohamednaseramein/blog-generator#95](https://github.com/mohamednaseramein/blog-generator/issues/95)
- PRD: [`projects/blog-generator/prd-auth-ep04.md`](https://github.com/mohamednaseramein/apexyard/blob/main/projects/blog-generator/prd-auth-ep04.md)
- Related AgDRs: [AgDR-0021](./AgDR-0021-auth-provider-supabase.md) (auth provider — supplies the SDK), [AgDR-0024](./AgDR-0024-soft-verification-gate.md) (verification gate — runs after the JWT is verified), [AgDR-0025](./AgDR-0025-role-column-vs-table.md) (role model — read fresh per request)
