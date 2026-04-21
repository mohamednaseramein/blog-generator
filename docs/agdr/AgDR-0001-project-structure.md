# AgDR-0001 — Monorepo Project Structure

> In the context of a new greenfield full-stack application, facing the choice of how to organise the frontend and backend code, I decided to use a single npm-workspaces monorepo with `backend/` and `frontend/` packages to achieve a single-repository development workflow, accepting slightly more complex tooling over a polyrepo.

## Context

The PRD specifies React (TypeScript) frontend + Node.js/Express (TypeScript) backend. They share no production package dependencies today but share development conventions and may share types in the future.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| npm workspaces monorepo | Single repo, shared scripts, easy type-sharing later, one CI context | Slightly more complex root `package.json` |
| Separate repos (polyrepo) | Complete isolation, independent CI | Cross-repo type sharing requires publishing, harder DX for a solo team |
| Turborepo / Nx | Advanced caching and orchestration | Over-engineering for a two-package project |

## Decision

Chosen: **npm workspaces monorepo**, because the team is small, the packages are tightly related, and the overhead is minimal compared to polyrepo coordination.

## Consequences

- `backend/` and `frontend/` are separate npm packages with independent `tsconfig.json` and `package.json`
- Root `package.json` wires `concurrently` for `npm run dev`
- Future shared types can be extracted to a `shared/` package without a repo restructure

## Artifacts

- `package.json` (root workspaces config)
- `backend/package.json`, `frontend/package.json`
