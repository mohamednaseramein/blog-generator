---
id: AgDR-0033
timestamp: 2026-05-11T12:00:00Z
agent: claude-opus-4-7 (Tech Lead role)
model: claude-opus-4-7
session: landing-page-tech-design
trigger: user-prompt
status: executed
---

# AgDR-0033 — Landing Page Prerender: Custom Playwright Post-Build Script

> In the context of the public landing page at `/` (PRD #118, US-7 SEO + US-10 Lighthouse Performance ≥ 90 mobile), facing a choice between trusting Googlebot's JavaScript rendering (matching AgDR-0030's pattern for the help page), adopting an off-the-shelf Vite prerender plugin, writing a custom Playwright post-build script that snapshots the rendered HTML, or migrating the landing route to Astro, I decided to write a small custom Playwright post-build prerender script that snapshots `/` (and other public routes as they appear) to `dist/index.html` after `vite build`, to achieve deterministic Lighthouse Performance ≥ 90 without paying React hydration cost on first paint, accepting the tradeoff of owning ~80 lines of build-tooling code in exchange for reusing the Playwright dependency we already need for visual-regression + e2e tests and avoiding third-party plugin abandonment risk.

## Context

PRD #118 mandates:

- US-7 — full SEO surface: `<title>`, meta description, Open Graph, Twitter Card, JSON-LD `SoftwareApplication`, `sitemap.xml`, `robots.txt`. Passes Google Rich Results Test.
- US-10 — Lighthouse Performance ≥ 90 (mobile p75), SEO ≥ 95, Accessibility ≥ 95. LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms. First-paint JS ≤ 100 KB gzipped. Lighthouse CI gates merge.
- Landing is the **signup-conversion funnel** — bounce rate and CTR depend on first-paint speed. Performance is a primary success metric, not a hygiene check.

Current frontend: React 18 + Vite 5 + TypeScript + Tailwind v4 + React Router v7. SPA, no SSR, no SSG. No headless-browser dependency in the stack today. Both tech designs (#118 + #119) commit to adding Playwright for visual-regression + e2e tests, so Playwright lands in `devDependencies` regardless.

Prior precedent — **[AgDR-0030](./AgDR-0030-ai-detector-help-page-rendering.md)** chose a plain SPA route for `/help/ai-detector-rules` and explicitly said *"if Google Search Console reports crawl errors or low impressions for 4 weeks post-launch, open a follow-up AgDR proposing SSG / Astro / Next.js"*. That escape hatch is now relevant: the landing page is the higher-stakes case where the same trade-off needs a different answer.

Key reason to break from AgDR-0030 for landing specifically:

- Help page is informational; landing is conversion-critical
- Help page can tolerate slower first paint; landing's bounce-rate sensitivity makes Performance ≥ 90 a hard requirement
- React hydration on a CSR shell at mobile-Moto-G4 throttling consistently makes LCP < 2.5 s borderline; prerendered HTML moves first paint off the hydration critical path entirely

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **A. SPA route — trust Googlebot (match AgDR-0030)** | Smallest delta; same pattern team already uses for `/help/ai-detector-rules`; zero new build infra; fastest to ship | Lighthouse Performance ≥ 90 is borderline with React hydration cost on mobile; conversion funnel is bounce-sensitive — slow first paint hurts CTR; Googlebot JS rendering is best-effort, not guaranteed |
| **B. Custom Playwright post-build script (chosen)** | Deterministic Performance — first paint is real HTML, hydration is off the critical path; reuses Playwright already coming in for tests (no second tool); fully owned ~80 LOC, debuggable; trivial to extend to other public routes (`/help/ai-detector-rules`, legal pages); no plugin abandonment risk | We own and maintain the script; need to handle script-tag normalisation (strip HMR client), asset path rewriting if any, hydration-marker placement; small upfront learning curve |
| **C. `@prerenderer/vite-plugin` off-the-shelf** | Purpose-built; handles SPA hydration markers out of the box; smaller custom code surface | External dep that lags Vite minor/major bumps (real risk on Vite 5 → 6); less debuggable when the build breaks; adds a second tool (prerender plugin + Playwright) for what is effectively the same job |
| **D. Migrate landing to Astro** | Best Lighthouse score out-of-box; purpose-built for content-heavy SEO; React island support keeps `AppHeader` reusable as an island | Two build systems in one repo; deploy complexity; shared components need cross-framework packaging; for ONE route, infrastructure cost vastly outweighs benefit; team learning curve |

## Decision

**Chosen: Option B — custom Playwright post-build prerender script.**

### Mechanics

1. After `vite build` produces `dist/`, a new npm script `prerender` runs:
   - Spins up `vite preview` on a local port (or uses `serve-handler` on `dist/`)
   - Uses Playwright Chromium to navigate to each route in `PRERENDER_ROUTES = ['/']`
   - Waits for `networkidle` + a custom `data-prerender-ready` attribute set on `<body>` after `LandingPage` mounts
   - Captures `await page.content()`
   - Post-processes: removes Vite dev artefacts (HMR client tags shouldn't be in prod build, but defensive strip), inlines critical CSS (optional follow-up — skip in v1), preserves React 18's hydration data attributes
   - Writes to `dist/<route>/index.html` (`/` writes `dist/index.html`)
2. `npm run build` calls `vite build && npm run prerender` — the Docker image / static host serves prerendered HTML for `/` and the existing CSR shell for everything else
3. Script location: `frontend/scripts/prerender.mjs`
4. Routes are configured in `frontend/prerender.config.json` so adding `/help/ai-detector-rules` later is a one-line change

### Why this is the right call now (not later)

- AgDR-0030's escape hatch ("if indexing trouble, migrate to SSG") exists for the help page. For landing, the failure mode isn't just indexing — it's **bounce rate from slow first paint**. We can't measure that post-hoc the way we can measure Search Console impressions, and the fix is the same anyway. Pay the cost upfront.
- The PRD's Lighthouse CI gate (Performance ≥ 90, fail-the-PR) makes "ship it and see" non-viable — a PR that ships landing as plain SPA will likely fail CI on the first attempt.
- Playwright is already a committed dependency. Reusing it for prerender is free; adopting a separate prerender plugin would mean two ways of headless-browsing in one repo.

### Escape hatches

If the custom script proves brittle on Vite version bumps or React 19 hydration changes:

1. **Short term** — pin Playwright + Vite versions in `package.json` exactly until we have time to update
2. **Medium term** — migrate to `@prerenderer/vite-plugin` (Option C) for less hand-rolled code
3. **Long term** — if landing becomes content-heavy (blog, changelog, case studies), migrate to Astro (Option D); the React islands story preserves `AppHeader` reuse

## Consequences

- **One new build step** — `npm run prerender` runs after `vite build`. Adds ~5–10 s to a clean build (Playwright cold start). CI caches Playwright browsers, so subsequent runs are faster.
- **Playwright is now a build-time dep**, not just a test dep. Bumps to `frontend/package.json` move `playwright` from `devDependencies` test-only to a position used by `build`. Production Docker image's build stage installs Playwright + Chromium; the runtime image stays slim (multi-stage build).
- **Lighthouse Performance is predictable** — prerendered HTML means LCP measures the size and decode time of the hero image, not the JS execution + hydration tax. The Performance ≥ 90 budget becomes "achievable with normal image discipline" instead of "borderline with constant fighting".
- **`AppHeader` and `UserSettingsMenu` need to render correctly in the prerender pass** — the initial render must reflect the *logged-out* state (no Supabase session at build time), then hydrate to the correct state on the client. This is standard React 18 hydration behaviour; the prerender script does not need special handling, but the components must avoid rendering session-specific content during SSR-pass. Verified by the prerender step running through them as a build-time smoke check.
- **The escape hatch from AgDR-0030 is partially consumed** — landing has chosen prerender. The help page (#115 territory) stays SPA-routed under AgDR-0030's original choice until/unless its own indexing data justifies a migration.
- **Future routes**: adding a route to the prerender list is a config change, not a code change. The legal pages (privacy, terms, cookies) and any future blog/changelog land naturally.

## Artifacts

- PRD: [`projects/blog-generator/prd-landing-page.md`](../../projects/blog-generator/prd-landing-page.md) — US-7 SEO, US-10 Performance budget
- Tech design: [`projects/blog-generator/technical-design-landing-page.md`](../../projects/blog-generator/technical-design-landing-page.md) — Architecture § "Build & Prerender", Tasks 17 + 18
- Related: [`AgDR-0030-ai-detector-help-page-rendering.md`](./AgDR-0030-ai-detector-help-page-rendering.md) — sets the precedent this decision deliberately diverges from for the higher-stakes case
- Implementation: `frontend/scripts/prerender.mjs` (new), `frontend/prerender.config.json` (new), `frontend/package.json` (add `playwright` to deps used by build), `frontend/Dockerfile` (multi-stage to keep runtime slim), `.github/workflows/lighthouse-landing.yml` (existing in tech design — runs against prerendered build)
- Phase-2 escape hatches: monitor first-paint metrics via existing RUM analytics; if Performance regresses or maintenance burden becomes high, open a follow-up AgDR proposing `@prerenderer/vite-plugin` or Astro migration
