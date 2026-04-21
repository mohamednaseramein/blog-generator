# Blog Generator

AI-guided wizard for producing fully-structured blog posts — step by step, with the human in control throughout.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript (strict) + Vite + Nginx |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (hosted PostgreSQL + JS client) |
| AI | Anthropic Claude API |
| Container | Docker Compose (backend + frontend) |
| Testing | Vitest (unit/integration) + Playwright (E2E) |

---

## Prerequisites

- Node.js ≥ 20 and npm ≥ 10 (local development)
- Docker + Docker Compose (containerised run)
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com/)

---

## Supabase setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (backend only — never expose to browser)
   - **anon public** → `SUPABASE_ANON_KEY` (safe for frontend)
3. Open the **SQL Editor** in your Supabase dashboard and run the contents of `backend/src/db/schema.sql` to create the tables.

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

ANTHROPIC_API_KEY=sk-ant-your-key-here
JWT_SECRET=a-long-random-secret-min-32-chars
```

### 3. Start the app (hot reload)

```bash
npm run dev
```

- Backend API → `http://localhost:3000`
- Frontend → `http://localhost:5173`

The Vite dev server proxies `/api/*` to the backend automatically.

---

## Running with Docker

### 1. Configure environment variables

```bash
cp .env.example .env
# fill in all values as above
```

### 2. Build and start

```bash
docker compose up --build
```

- Frontend → `http://localhost:80`
- Backend API → `http://localhost:3000` (also reachable via `http://localhost:80/api/` through Nginx)

### 3. Stop

```bash
docker compose down
```

> **Note:** The database is Supabase cloud — Docker Compose runs only the backend and frontend containers.

---

## Running tests

```bash
# Unit tests
npm run test --workspace=backend

# Watch mode
npm run test:watch --workspace=backend
```

### Type checking

```bash
npm run typecheck --workspace=backend
npm run typecheck --workspace=frontend
```

---

## API reference

All endpoints require authentication (JWT via `Authorization: Bearer <token>`).

> Auth is a placeholder during EP-01 development — fully wired in EP-04.

### Create a blank blog

```
POST /api/blogs
```

Response `201`:
```json
{ "blogId": "uuid", "currentStep": 0 }
```

---

### Submit blog brief

```
POST /api/blogs/:id/brief
```

Request body:
```json
{
  "title": "10 Benefits of Morning Routines",
  "primaryKeyword": "morning routine benefits",
  "audiencePersona": "Busy professionals aged 25–40 seeking productivity",
  "toneOfVoice": "conversational",
  "wordCountMin": 1200,
  "wordCountMax": 1800,
  "blogBrief": "Focus on science-backed benefits, include actionable tips",
  "referenceUrl": "https://example.com/article"
}
```

All fields except `referenceUrl` are required. If a `referenceUrl` is provided, background scraping starts immediately.

Response `201`:
```json
{ "blogId": "uuid", "scrapeStatus": "pending" }
```

`scrapeStatus` is `"pending"` when a reference URL was supplied, `"skipped"` otherwise.

---

### Get saved brief

```
GET /api/blogs/:id/brief
```

Returns the full `BlogBrief` object including current `scrapeStatus`.

---

### Poll scrape status

```
GET /api/blogs/:id/brief/scrape-status
```

Response `200`:
```json
{ "scrapeStatus": "success", "scrapedContentLength": 4320 }
```

| `scrapeStatus` | Meaning |
|----------------|---------|
| `pending` | Scraping in progress — poll again in 2 s |
| `success` | Content scraped and stored |
| `failed` | Scraping failed (403 / timeout) — blog continues without it |
| `skipped` | No reference URL was provided |

---

## Project structure

```
blog-generator/
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── db/
│       │   ├── supabase.ts          # Supabase client (lazy init)
│       │   └── schema.sql           # run once via Supabase SQL editor
│       ├── domain/
│       │   ├── types.ts             # Blog, BlogBrief interfaces
│       │   └── value-objects.ts     # WordCountRange, ReferenceUrl
│       ├── repositories/
│       │   ├── blog-repository.ts
│       │   └── blog-brief-repository.ts
│       ├── services/
│       │   └── url-scraper-service.ts   # axios + cheerio, fire-and-forget
│       ├── handlers/
│       │   ├── blog-handler.ts
│       │   └── blog-brief-handler.ts
│       ├── middleware/
│       │   ├── auth.ts              # placeholder (EP-04)
│       │   └── error-handler.ts
│       ├── routes/
│       │   └── blog-routes.ts
│       └── index.ts
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── api/blog-api.ts
│       ├── components/
│       │   ├── BlogBriefForm.tsx        # React Hook Form + Zod
│       │   └── ScrapeStatusIndicator.tsx
│       ├── App.tsx
│       └── main.tsx
├── docs/agdr/
│   ├── AgDR-0001-project-structure.md
│   ├── AgDR-0002-url-scraping-approach.md
│   ├── AgDR-0003-supabase-database-client.md
│   └── AgDR-0004-docker-containerisation.md
├── docker-compose.yml
├── .dockerignore
├── .env.example
└── package.json
```

---

## Validation rules

| Field | Rule |
|-------|------|
| All required fields | Must be non-empty |
| `wordCountMin` | Must be a positive integer > 0 |
| `wordCountMax` | Must be ≥ `wordCountMin` |
| `referenceUrl` | Must be a well-formed `http`/`https` URL if provided |
| `referenceUrl` | Must point to a public host (localhost and private IPs are blocked) |
| All string fields | Leading/trailing whitespace is trimmed before saving |

---

## Error responses

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing required fields, invalid word count range, bad URL |
| 401 | `UNAUTHORIZED` | No valid session |
| 403 | `FORBIDDEN` | Blog belongs to a different user |
| 404 | `NOT_FOUND` | Blog ID doesn't exist |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

---

## What's next

| | Description |
|--|-------------|
| US-07 | AI Alignment Summary — generate and iterate before proceeding |
| EP-04 | Authentication — register, login, JWT sessions |
| EP-02 | Dashboard — list, resume, manage blogs |
| EP-03 | Blog Generation Wizard — 6 AI-powered steps |
