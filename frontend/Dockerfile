# ── Stage 1: build the Vite bundle ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=frontend

COPY frontend/ ./frontend/

# Vite public env vars must be baked in at build time
ARG VITE_API_URL=/api
ARG VITE_BASE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE_URL=$VITE_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build --workspace=frontend

# ── Stage 2: serve with Nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

ARG APP_VERSION=0.1.0
ARG GIT_SHA=
LABEL org.opencontainers.image.title="blog-generator-frontend" \
  org.opencontainers.image.version="${APP_VERSION}" \
  org.opencontainers.image.revision="${GIT_SHA}"

# For Compose healthcheck / `up --wait` (not included in the stock nginx image).
RUN apk add --no-cache curl

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
