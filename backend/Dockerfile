FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for the whole workspace first (layer-cache friendly)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=backend

# Copy source and build
COPY backend/ ./backend/
RUN npm run build --workspace=backend

# ── Production image ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

ARG APP_VERSION=0.1.0
ARG GIT_SHA=
ENV APP_VERSION=$APP_VERSION
ENV GIT_SHA=$GIT_SHA
LABEL org.opencontainers.image.title="blog-generator-backend" \
  org.opencontainers.image.version="${APP_VERSION}" \
  org.opencontainers.image.revision="${GIT_SHA}"

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=backend --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist

# SQL migration files are not compiled by tsc; copy them next to the compiled
# migrate.js so the runner can find them at backend/dist/db/migrations/*.sql
COPY backend/src/db/migrations ./backend/dist/db/migrations

EXPOSE 3000

# Run pending migrations (idempotent) then start the API server.
CMD ["sh", "-c", "node backend/dist/db/migrate.js && node backend/dist/index.js"]
