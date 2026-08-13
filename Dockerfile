# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
# libc6-compat: necessário para vários binários nativos (ex.: sharp) no Alpine.
RUN apk add --no-cache libc6-compat \
  && (corepack disable || true)

FROM base AS deps
COPY package.json package-lock.json* ./
# Cache npm + retries: o install do sharp baixa libvips no GitHub e falha
# intermitente com ECONNRESET derruba o CI sem isso.
RUN --mount=type=cache,target=/root/.npm \
  npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && for attempt in 1 2 3 4 5; do \
       echo "npm ci (tentativa ${attempt}/5)..." \
       && npm ci \
       && break \
       || { \
            echo "npm ci falhou na tentativa ${attempt}" \
            && if [ "${attempt}" -eq 5 ]; then exit 1; fi \
            && sleep $((attempt * 8)); \
          }; \
     done

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_VERSION=0.0.0
# Opcional mas recomendado em Docker/Swarm: chave estável para Server Actions (openssl rand -base64 32).
# Sem isto, cada build gera IDs diferentes e pedidos antigos podem falhar após deploy.
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "-c", "(test -n \"$SUPABASE_URL\" || test -n \"$NEXT_PUBLIC_SUPABASE_URL\") && (test -n \"$SUPABASE_ANON_KEY\" || test -n \"$NEXT_PUBLIC_SUPABASE_ANON_KEY\") && node server.js || (echo \"Missing Supabase env: set SUPABASE_URL/SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY\" && exit 1)"]
