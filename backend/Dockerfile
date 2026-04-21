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

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=backend --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
