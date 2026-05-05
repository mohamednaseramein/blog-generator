---
id: AgDR-0024
timestamp: 2026-05-04T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ep-04-auth-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0024 — Verification Gate: Soft (Login Allowed, Blog Creation Blocked)

> In the context of enforcing email verification in EP-04, facing the choice between a hard gate (block login until verified), a soft gate (login allowed but write actions blocked), or no gate (verification optional), I decided to use a **soft gate** that lets unverified users log in, browse, and view predefined profiles, but blocks `POST /api/blogs` (and the equivalent client-side action) until `users.email_verified_at IS NOT NULL`, to achieve a balance between discouraging drive-by registrations and not punishing genuine users who haven't clicked the link yet, accepting the tradeoff that unverified users still occupy a session and consume a small amount of backend / Supabase quota.

## Context

EP-04 ([epic #95](https://github.com/mohamednaseramein/blog-generator/issues/95)) introduces email verification (US-AUTH-02) which gives us a signal that an email address is real and reachable. The product question is: **what happens between registration and verification?**

Three plausible postures:

1. **Hard gate** — login blocked until the user clicks the verification link
2. **Soft gate** — login allowed; certain write actions (here, blog creation) blocked until verified
3. **No gate** — verification is purely informational; nothing is blocked

The PRD § Constraints pre-decides the soft gate. The user stories that depend on this decision:

- **US-AUTH-01 AC4** — registration redirects to a "Check your email" page that explains verification is required *to create blogs*
- **US-AUTH-03 AC3** — login is allowed for unverified users; dashboard banner explains the gate
- **US-AUTH-07** — explicitly defines the soft-gate behaviour (banner, client-side block, server-side `403 EMAIL_NOT_VERIFIED`)
- **US-AUTH-08 AC3** — admin force-reset is independent of verification (admins can reset *any* user)

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Soft gate (chosen)** | Lets users explore the product before committing; lower friction → higher conversion in registration → first-action funnel; banner + blocked-action message keeps verification top-of-mind without locking the user out; matches what most modern SaaS products do (Linear, Vercel, Notion, Figma) | Unverified accounts persist in the system; possibility of unverified users leaving feedback or hitting other surfaces we haven't considered yet; gate enforcement must be threaded through every "creates content" path going forward (test discipline) |
| Hard gate (block login until verified) | Strongest signal-validity guarantee; fewer accidentally-spammy accounts; simpler — the gate is a single check at the login boundary | Punishes users with email-delivery delays (~30s in Mailtrap dev, longer in prod with anti-spam pipelines); registration → first-login conversion drops because users hit a wall when they could have explored; no ability to remind the user of the gate inside the app |
| No gate | Fastest perceived experience; works fine if email verification is purely a "trust score" not a gate | We lose the signal entirely — no protection against typo-emails (`me@gmial.com`), against throwaway addresses being treated as real users, or against future password-reset requests going to addresses that were never confirmed |

## Decision

Chosen: **Soft gate**, scoped narrowly to `POST /api/blogs` (and any subsequent action that materialises persistent content owned by the user — currently just blog creation).

**What is gated:**

- `POST /api/blogs` returns `403 EMAIL_NOT_VERIFIED` when `req.user.email_verified_at IS NULL`. Frontend hides / disables the "New Blog" CTA in the same state and surfaces a `Verify your email to create blogs` banner with a `Resend verification email` action.

**What is NOT gated:**

- Login itself (US-AUTH-03 AC3)
- Browsing the dashboard
- Viewing predefined author profiles (US-AUTH-07 AC3 says the user can read these)
- Reading existing blogs they own (none should exist for an unverified user, but if they do — e.g. through pre-cutover dev data adoption — read access is preserved)
- Logout, password reset, resend verification — all available regardless

**Where the check lives:**

- Backend: `requireVerifiedEmail` middleware applied to the single route `POST /api/blogs`. Reads `users.email_verified_at` per request (cheap — already loaded for the role check, see [AgDR-0025](./AgDR-0025-role-column-vs-table.md)).
- Frontend: a `useVerifiedEmail()` hook returns the boolean; the dashboard banner and the disabled state on the "New Blog" button both consume it. The 403 from the backend is the defence-in-depth backstop.

## Consequences

- **The gate is single-route discipline.** Every future "creates user-owned content" endpoint must explicitly attach `requireVerifiedEmail`. This is a known foot-gun — a future engineer adding `POST /api/some-new-thing` without the middleware would let unverified users through. Mitigations:
  - Tech design for any new write endpoint must call out whether the gate applies
  - PR review checklist (Code Reviewer agent) adds a "verification gate considered?" item for any new route mutating user data
  - Future option: invert the model so middleware is applied at the router level and routes opt out — out of scope for v1
- **Verification status is mutable** — `users.email_verified_at` flips from NULL to a timestamp on first verification and never flips back in v1. Email-change flow is out of scope (PRD § Non-Goals).
- **No cron job** — we don't expire unverified accounts on a timer. PRD § Non-Goals defers anti-abuse / cleanup of stale unverified accounts; if abuse appears we add a job in a follow-up.
- **Banner UX persists** every page load until verification — accepted minor friction; the alternative ("dismiss for this session") would let users forget and confuse-loop on their first blog attempt.
- **Pre-cutover migration interaction:** the cutover migration ([AgDR-0026](./AgDR-0026-cutover-adopt-by-first-admin.md)) sets `email_verified_at = NOW()` for the first admin so existing dev data ends up under a verified account. New users post-cutover follow the standard flow.
- **Metric implication:** "Email verification rate" target of ≥ 60 % within 7 days (PRD § Success Metrics) is achievable under a soft gate because the user experiences the friction *every time* they try to create a blog — much higher salience than a one-time hard gate at login.
- **Future supersession** would be triggered by: spam/abuse from unverified accounts exceeding a threshold (then move to hard gate), regulatory requirement for verified email, or product evolution where the read-only experience becomes valuable on its own (then we might *remove* the gate entirely).

## Artifacts

- Epic ticket: [mohamednaseramein/blog-generator#95](https://github.com/mohamednaseramein/blog-generator/issues/95)
- PRD: [`projects/blog-generator/prd-auth-ep04.md`](https://github.com/mohamednaseramein/apexyard/blob/main/projects/blog-generator/prd-auth-ep04.md) — see US-AUTH-07 specifically
- Related AgDRs: [AgDR-0021](./AgDR-0021-auth-provider-supabase.md) (auth provider — owns `email_confirmed_at` on `auth.users`), [AgDR-0025](./AgDR-0025-role-column-vs-table.md) (role/verification both read from the same `users` row per request)
