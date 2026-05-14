---
id: AgDR-0034
timestamp: 2026-05-12T19:30:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: landing-page-implementation
trigger: user-prompt
status: executed
---

# AgDR-0034 — Landing Head Management: `react-helmet-async`

> In the context of the Landing Page epic (#118) needing per-route SEO meta, Open Graph, Twitter Card, and JSON-LD `<head>` tags (PRD US-7, Group D / #123), facing a choice between adding `react-helmet-async`, hard-coding all tags in `frontend/index.html`, or post-processing the head in the prerender script (Group G / #126), I decided to add `react-helmet-async` as a runtime dependency and let each prerendered route render its own `<Helmet>` block, to achieve clean per-route SEO with no build-step coupling, accepting the tradeoff of a small dependency (~5 KB gzipped) and one new React provider in the tree.

## Context

PRD #118 US-7 requires the landing page to ship: `<title>`, meta `description`, `viewport`, `canonical`, Open Graph (`og:title`, `og:description`, `og:type`, `og:image`, `og:url`), Twitter Card (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`), and JSON-LD `SoftwareApplication` structured data. Google Rich Results Test must pass with zero errors.

The tech design (`projects/blog-generator/technical-design-landing-page.md` § Implementation Plan task 12) explicitly flagged this as a PR-time decision: *"React 18 native `<head>` children OR `react-helmet-async`"*.

Constraints:

- React 18.3 — native `<head>` children are React 19 only; not an option today
- Vite SPA, no SSR — `frontend/index.html` is served identically for every route
- Prerender (AgDR-0033, Group G #126) snapshots fully-rendered HTML for `/` and other public routes — head tags rendered into the React tree must end up in the prerendered HTML
- `/help/ai-detector-rules` already ships under AgDR-0030 as a SPA route and may want its own `<head>` later — solution must extend to N public routes

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **A. `react-helmet-async` (chosen)** | Standard React pattern; per-route `<Helmet>` blocks colocated with the page component; works seamlessly with the Group G prerender (snapshot captures `document.head` after render); extends to `/help/ai-detector-rules` and any future public route at zero marginal cost; well-maintained, actively used by Next.js / Remix / similar | New dependency (~5 KB gzipped); one extra `<HelmetProvider>` in the tree |
| **B. Hard-code all tags in `frontend/index.html`** | Zero new dependency; tags appear in raw HTML, no React execution needed | Mixes concerns — landing's SEO concerns leak into the shared shell that also serves `/dashboard`, `/profile`, etc.; can't differ per route without a per-route HTML file (which Vite doesn't natively support without `vite-plugin-pages`-style tooling) |
| **C. Post-process `<head>` in the prerender script (Group G)** | Keeps React tree free of head logic; head tags fully build-time | Couples head content to build script — every per-route change needs script edits; harder to test in isolation; runtime auth-state-aware behaviour (e.g. canonical URL based on env) loses the React context |
| **D. Lazy `useEffect` setting `document.title` etc.** | No dependency | Doesn't work for prerendering — `useEffect` doesn't run during the prerender's `await page.content()` capture; bots see whatever was statically rendered, which is nothing |

## Decision

**Chosen: Option A — `react-helmet-async`.**

### Mechanics

1. Add `react-helmet-async` to `frontend/package.json` `dependencies`
2. Wrap the app in `<HelmetProvider>` (in `App.tsx` or `main.tsx`)
3. `frontend/src/landing/seo.ts` exports typed constants:
   - `LANDING_SEO_TITLE`, `LANDING_SEO_DESCRIPTION`, `LANDING_OG_IMAGE_PATH`
   - `landingJsonLd()` — function returning the `SoftwareApplication` JSON-LD object (parameterised on env)
4. `frontend/src/landing/LandingHead.tsx` uses `<Helmet>` to render `<title>`, `<meta>`, `<link rel="canonical">`, and `<script type="application/ld+json">`
5. `LandingPage.tsx` renders `<LandingHead />` as a sibling of the page sections
6. When Group G (#126) prerenders `/`, the captured `document.head` includes everything Helmet placed there — bots see real meta tags

### Why this beats Option B (hard-code in `index.html`)

`frontend/index.html` is the shared shell for every route. If we hard-code landing's `og:title="Ship blog drafts that don't read like AI"` there, that string also serves on `/dashboard`, `/profile`, etc. — which is fine because they're `noindex`, but it's a meaning leak. With Helmet, each route owns its own head; the dashboard can later add `<Helmet><title>Dashboard</title></Helmet>` without touching `index.html`.

### Why this beats Option C (post-process in prerender)

The prerender script's job is to capture rendered HTML — adding head-rewriting logic to it couples landing's SEO to the build script. With Helmet, the script is unchanged: it captures `document.head` as React rendered it. Adding `/help/ai-detector-rules` to the prerender list later means writing a `HelpHead` component, not modifying the script.

### Bundle cost

`react-helmet-async@1.x` is ~5 KB gzipped. Acceptable against PRD US-10's 100 KB first-paint JS budget — landing page is far from saturating that limit.

## Consequences

- One new runtime dep (`react-helmet-async`) in `frontend/package.json`
- One new provider (`<HelmetProvider>`) wraps the app in `App.tsx`
- `frontend/src/landing/seo.ts` and `LandingHead.tsx` become the canonical source for landing's head — any future SEO tweak is a single-file diff
- Pattern extends cleanly: `/help/ai-detector-rules` can adopt the same approach by adding `HelpHead.tsx` when its SEO needs grow beyond the basic title
- Group G's prerender script needs zero special handling for head tags — Helmet's React effects run during the render, the snapshot captures the post-render `<head>`
- `frontend/index.html` keeps its minimal default `<title>` (acts as fallback for routes that don't render a `<Helmet>`)

## Artifacts

- PRD: [`projects/blog-generator/prd-landing-page.md`](../../projects/blog-generator/prd-landing-page.md) — US-7
- Tech design: [`projects/blog-generator/technical-design-landing-page.md`](../../projects/blog-generator/technical-design-landing-page.md) § Implementation Plan task 12
- Related: [`AgDR-0033-landing-prerender-approach.md`](./AgDR-0033-landing-prerender-approach.md) — the prerender script will capture Helmet's output as-is, no integration work needed
- Implementation: `frontend/package.json` (add `react-helmet-async`), `frontend/src/main.tsx` (wrap with `<HelmetProvider>`), `frontend/src/landing/seo.ts` (new), `frontend/src/landing/LandingHead.tsx` (new), `frontend/src/landing/LandingPage.tsx` (render `<LandingHead />`)
