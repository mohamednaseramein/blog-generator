# AgDR-0002 — URL Scraping: Library and Execution Model

> In the context of scraping optional reference URLs submitted in the blog brief form, facing the choice of HTTP + HTML-parsing library and execution model, I decided to use axios + cheerio with a fire-and-forget async call (no queue in v1) to achieve simplicity and low operational overhead, accepting the risk of unbounded concurrency at higher traffic.

## Context

AC7/AC8 of US-06 require background scraping of an optional reference URL. The result must not block the form submission response. Content is stored for use in later AI steps. v1 has low concurrency expectations (beta with invited users).

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| axios + cheerio (fire-and-forget) | Zero infrastructure, simple code, instant to ship | No retry, no concurrency control, no observability |
| BullMQ / Redis queue | Retry, rate-limit, observability | Requires Redis infra, significant complexity for v1 |
| Playwright / puppeteer | Handles JS-heavy SPAs | Heavy dependency, overkill for static HTML scraping |

## Decision

Chosen: **axios + cheerio, fire-and-forget**, because the user base is small (beta), static HTML is sufficient for the reference URLs expected, and adding a queue in v1 would be over-engineering. A queue (BullMQ) is the natural v2 upgrade path when usage grows.

## Consequences

- Scrape failures are silent to the API response — frontend polls `scrape-status` endpoint
- AC8 is satisfied by setting `scrape_status = 'failed'` and notifying the user via the polling UI
- SSRF protection enforced in `ReferenceUrl` value object (blocks localhost, private IPs)
- Content truncated at 10,000 chars before storage

## Artifacts

- `backend/src/services/url-scraper-service.ts`
- `backend/src/domain/value-objects.ts` (ReferenceUrl SSRF guard)
