---
id: AgDR-0013
timestamp: 2026-04-23T00:00:00Z
agent: Claude
trigger: user-prompt
status: proposed
ticket: mohamednaseramein/blog-generator#35
---

# AgDR-0013 — Publish (Step 5): Copy & Download MVP (No CMS)

## Context

The wizard ends after **draft confirm** with a placeholder (“Publish — Step 5 coming
soon”). Product agreed **Step 1** for Publish is **copy/paste** (and optional
**download**), with **CMS integrations later**. `WizardProgress` already labels
step 5 as **Publish**.

## Decision

1. **New wizard state `publish`** — Entered after `confirmDraft` succeeds (after
   Step 4). Replaces jumping straight to `done` for the export UX.
2. **Data** — Load markdown via existing `GET /api/blogs/:id/draft` (requires
   `draft_confirmed`). No new tables for MVP.
3. **Copy** — Browser **Clipboard API** (`navigator.clipboard.writeText`) for
   `draft.markdown`. Show success toast; on `NotAllowedError` / failure, message
   user and rely on **Download** as fallback.
4. **Download** — Client-side `Blob` + temporary `<a download>` with a safe
   filename, e.g. `blog-{shortId-or-title-slug}.md` (derive from brief title if
   available via `getBrief`, else `blog-{blogId.slice(0,8)}.md`).
5. **Accessibility** — Primary actions are real `<button>`s with clear labels;
   announce copy success for screen readers (`aria-live` or toast).
6. **Out of scope (MVP)** — CMS APIs, webhooks, server-side `published_at` (can
   be AgDR follow-up), HTML/rich-text clipboard.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| New `POST /publish` that returns body | Redundant with `GET /draft` already |
| Persist “exported” in DB | Useful for dashboard later; not required for copy MVP |
| HTML copy | Second phase; markdown is the canonical artifact today |

## Risks

- **Clipboard permission** in non-secure contexts or strict browsers — document
  Download fallback in AC.
- **Large posts** — clipboard limits; optional follow-up to chunk or warn.

## Testing

- Unit/component tests for filename sanitization if extracted.
- Manual: copy + download after full wizard; clipboard denied path.

## Rollback

Revert `PublishStep` and `App` routing; no migration to roll back.
