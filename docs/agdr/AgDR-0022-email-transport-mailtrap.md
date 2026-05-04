---
id: AgDR-0022
timestamp: 2026-05-04T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ep-04-auth-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0022 — Email Transport: Mailtrap (Sandbox in Dev/Test, Email API in Prod)

> In the context of sending verification, password-reset, and admin-triggered force-reset emails for EP-04, facing the choice between Mailtrap, Resend, SendGrid, AWS SES, Postmark, or Supabase's bundled email, I decided to use **Mailtrap Sandbox in dev/test and Mailtrap Email API in production**, with sender `me@mnaser.me`, to achieve a single vendor across both environments with a virtual inbox for safe dev testing and real delivery in prod, accepting the tradeoff that Mailtrap's deliverability ceiling is lower than SES/Postmark and that we will eventually need to verify SPF/DKIM for `mnaser.me` to keep prod delivery clean.

## Context

EP-04 ([epic #95](https://github.com/mohamednaseramein/blog-generator/issues/95)) sends transactional email at four moments:

1. **Verification email** on registration (24-hour token; US-AUTH-01 / US-AUTH-02)
2. **Forgot-password email** on user-initiated reset (1-hour token; US-AUTH-04 / US-AUTH-05)
3. **Resend verification** when the original token expires
4. **Admin-triggered force-reset** when an admin needs to reset another user's password (US-AUTH-08 AC3)

Supabase Auth handles the *triggering* (which event sends what email) and the *templating* (default templates, customisable in the Supabase dashboard). What it does **not** ship is the SMTP relay — projects must configure their own Custom SMTP. That choice is what this AgDR records.

Two distinct environments matter:

- **Dev / test** — emails must never go to real inboxes. We need a virtual inbox we can inspect to confirm the link is correct, the token expires, and the copy renders.
- **Production** — emails must reliably reach Gmail / Outlook / Apple Mail with passing SPF/DKIM/DMARC and acceptable deliverability for transactional volume.

The PRD § Constraints pre-decides Mailtrap; this AgDR records the trade-off and the dual-environment configuration.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Mailtrap (Sandbox dev/test, Email API prod) — chosen** | Single vendor across both environments; Sandbox virtual inboxes are best-in-class for verifying email content during dev; Email API has reasonable deliverability for transactional v1 volume; one bill, one set of credentials shapes; same template rendering both sides → fewer surprises at cutover | Lower deliverability ceiling than SES/Postmark at scale; less mature reputation-management tooling; if we ever hit a deliverability issue we may need to switch prod transport — losing the "single vendor" benefit |
| Resend | Modern DX, great DKIM/SPF setup wizard, healthy deliverability, generous free tier | No native dev-inbox concept (would need a separate dev SMTP like MailHog) → two vendors |
| AWS SES | Cheapest at scale, excellent deliverability once warmed up, AWS-native | Requires sandbox-removal request, region/quota juggling, no virtual-inbox dev story (need MailHog/Mailtrap for that anyway) → still two vendors |
| Postmark | Industry-leading transactional deliverability, strong analytics | Premium pricing for v1's volume; same dev-vs-prod-split issue as SES/Resend |
| SendGrid | Massive provider, well-known | Worst-of-both — paid plan needed for decent reputation, complex UI, no compelling reason over Resend or Postmark |
| Supabase's bundled email (default SMTP) | Zero-config | **Unusable in production** — Supabase explicitly warns it is rate-limited and not for production traffic; no SPF/DKIM control; we'd still need a real provider for prod, so we'd be configuring two anyway |
| MailHog (dev) + a paid prod provider | MailHog is local-only, zero cost, fast feedback | Local-only means we lose dev-environment-on-CI testing of email; team members on different machines see different state; two vendors (MailHog + e.g. Resend) |

## Decision

Chosen: **Mailtrap end-to-end**, with environment switching driven by env vars:

| Env | Mode | Endpoint |
|-----|------|----------|
| Local dev | Mailtrap **Sandbox** SMTP | `sandbox.smtp.mailtrap.io` |
| CI / staging | Mailtrap **Sandbox** SMTP (separate inbox per environment) | `sandbox.smtp.mailtrap.io` |
| Production | Mailtrap **Email API** | `smtp.mailtrap.io` (or HTTP API) |

Sender address: **`me@mnaser.me`** (resolved from PRD § Open Questions on 2026-05-04).

The switch is configured in the Supabase dashboard (project → Auth → Email → Custom SMTP). Backend code does not touch SMTP directly — Supabase Auth dispatches all four email types using whatever SMTP we point it at. This means **the env-switching boundary is the Supabase project, not the application code**: dev/test connects to a Supabase project (or branch) configured for Sandbox; prod connects to one configured for Email API.

## Consequences

- **Operator setup work** before any email-sending code can be tested:
  - Mailtrap account provisioned with two products: Sandbox + Email API
  - Sandbox inbox created for dev (and a separate one for staging if we add that env)
  - Email API domain `mnaser.me` added with SPF + DKIM records (DNS — operator action)
  - DMARC record on `mnaser.me` (recommended — `p=none` initially, raise once we see clean reports)
  - Custom SMTP configured in the Supabase dashboard for each environment
- **Sender domain SPF/DKIM** on `mnaser.me` is a launch blocker for production but **not** for dev/test (Sandbox doesn't enforce them — it's a virtual inbox).
- **Email-template ownership lives in Supabase**, not in our codebase. Editing the verification email body / subject / CTA is a Supabase-dashboard action, not a code change. Template versioning is informal — record changes in the issue tracker or a follow-up AgDR if we start iterating heavily.
- **No application-side email code.** The backend never imports `nodemailer` or similar — Supabase Auth is the only sender. If we later need transactional email for non-auth events (e.g. blog-published notifications), that's a separate AgDR.
- **Deliverability monitoring** is initially passive — Mailtrap dashboard shows sends/bounces/opens. If bounce rate exceeds 5% sustained, treat as an incident and re-evaluate transport.
- **Failure mode:** if Mailtrap is down, registration and password-reset effectively fail. PRD § Edge Cases specifies the user-facing response (generic 202, log internally, "Resend verification" available). We do not retry beyond Mailtrap's own retry — adding our own retry queue is YAGNI for v1.
- **Cost:** Mailtrap free tier covers Sandbox; Email API has a small monthly fee at v1 volumes. Within budget.
- **Future supersession** would be triggered by: deliverability incident lasting > 72h, sustained bounce rate > 5%, or v1 email volume exceeding the Email API quota.

## Artifacts

- Epic ticket: [mohamednaseramein/blog-generator#95](https://github.com/mohamednaseramein/blog-generator/issues/95)
- PRD: [`projects/blog-generator/prd-auth-ep04.md`](https://github.com/mohamednaseramein/apexyard/blob/main/projects/blog-generator/prd-auth-ep04.md)
- Related AgDRs: [AgDR-0021](./AgDR-0021-auth-provider-supabase.md) (auth provider — Supabase Auth dispatches the emails)
- DNS records on `mnaser.me`: SPF + DKIM (TBD during operator setup)
