---
id: AgDR-0030
timestamp: 2026-05-07T00:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: ai-detector-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0030 — AI Detector Help Page: SPA Route + Build-Time JSON Import

> In the context of the public `/help/ai-detector-rules` page that documents every rubric rule for writers (PRD US-8, FR-14), facing a choice between a SPA route in the existing Vite app, a Vite SSG pre-render, or a separate marketing/docs site, I decided to ship the page as a SPA route in the existing app that imports `ai-detector-rubric.generated.json` at build time and renders it client-side with proper SEO meta tags and a `<noscript>` fallback, to achieve the smallest delta from the current architecture and the fastest path to launch, accepting the tradeoff of trusting Googlebot's JavaScript rendering for indexing and committing to a Phase-2 migration to SSG if observed indexing turns out to be poor.

## Context

PRD FR-14: a `/help/ai-detector-rules` page rendering the full rubric (every rule, examples, fixes), accessible without authentication and indexable by search engines. PRD goal 6 calls this out as content-marketing-grade educational content.

Current frontend: React + TypeScript + Vite SPA. No SSR, no SSG today. All routes are client-rendered. Public routes (login, register, verify) and protected routes coexist via React Router's `<ProtectedRoute>` wrapper. There's no existing marketing site.

The page content is **fully static at build time** — the rubric YAML produces a JSON file consumed by the page component. There are no runtime user inputs, no dynamic content, no auth gates.

Open question raised in the tech design: does the help page go in the app, or in a separate marketing site for stronger SEO?

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **SPA route + build-time JSON import (chosen)** | Smallest delta from current arch; fastest to ship; live in v1 alongside the main feature; same deploy pipeline; Googlebot has been rendering JS since 2019 and indexes SPA routes that load content synchronously | Trusts Googlebot's JS execution; requires `<noscript>` fallback for the small minority of crawlers that don't run JS; slightly slower First Contentful Paint than pre-rendered HTML |
| Vite SSG pre-render (e.g. `vite-plugin-ssg`) | True static HTML for crawlers; best possible indexing posture; no JS dep for content | Adds a build plugin and a render-time hook; no other route currently needs SSG, so we'd be paying complexity for one page; iteration cost on every Vite upgrade |
| Separate marketing/docs site | Best SEO; can be styled independently; doesn't bloat the main app bundle | New deploy target, new domain or subpath, new CI; entirely new piece of infra for one page; mismatched with v1 timeline |
| Server-rendered route on the Express backend | Full HTML response, indexable | Express isn't set up for templating; would couple frontend rubric content to backend; awkward fit for the existing architecture |

## Decision

**Chosen: SPA route in the existing Vite app, importing the build-time JSON.**

- Route: `/help/ai-detector-rules`
- Component: `frontend/src/pages/AiDetectorRulesPage.tsx`
- Route is registered in `App.tsx` **outside** `<ProtectedRoute>` — public access
- Imports `frontend/src/lib/ai-detector-rubric.generated.json` synchronously
- HTML head set via React Helmet (or equivalent): `<title>`, `<meta name="description">`, `<meta property="og:*">`, semantic headings
- `<noscript>` block contains a brief textual fallback explaining the page needs JS and linking to the GitHub-rendered YAML source as a fallback for non-JS crawlers
- No runtime fetches; the page is functional offline once loaded

**Phase 2 trigger to migrate to SSG**: if Google Search Console reports that the page has crawl errors, a low impressions count, or fails the Mobile-Friendly Test for a measurable period (e.g. 4 weeks post-launch), open a follow-up AgDR proposing `vite-plugin-ssg` or migrating to a separate docs site (Astro / Next.js).

## Consequences

- Zero new build infrastructure. The page ships in the same `npm run build` as the rest of the frontend.
- One small additional build dependency: the JSON-from-YAML script (already required for AgDR-0027). No new framework dep.
- SEO posture is "good enough" — modern Googlebot indexes SPA routes that load content synchronously from a build-time source, which is exactly the case here. We are NOT relying on user-driven async loads.
- The `<noscript>` fallback ensures non-JS crawlers and users see something useful (a link to the GitHub-rendered YAML) — graceful degradation, not a dead page.
- If indexing performance is poor, the migration to SSG is straightforward because the page content is already build-time-static. We are not painting ourselves into a corner.

## Artifacts

- Tech design: [`projects/blog-generator/technical-design-ai-detector.md`](../../projects/blog-generator/technical-design-ai-detector.md) §§ "Architecture" data flow for help page, "Implementation Plan" Task 16
- Implementation: `frontend/src/pages/AiDetectorRulesPage.tsx` (new), route registration in `frontend/src/App.tsx`, `frontend/src/lib/ai-detector-rubric.generated.json` (build output, gitignored)
- Phase-2 follow-up: open new AgDR if Search Console signals indexing trouble after launch
