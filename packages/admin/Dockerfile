# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy all workspace package.json files for pnpm workspace resolution
COPY packages/admin/package.json ./packages/admin/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY --from=deps /app/ ./
COPY . .
RUN pnpm --filter @forkcart/admin... run build

# ── Stage 3: Production ──
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 forkcart
WORKDIR /app
ENV NODE_ENV=production
# Copy the full monorepo structure needed for pnpm start
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/admin ./packages/admin
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/i18n ./packages/i18n
USER forkcart
EXPOSE 3000
CMD ["pnpm", "--filter", "@forkcart/admin", "start"]
