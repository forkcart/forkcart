# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/api/package.json ./packages/api/package.json
# Copy all workspace package.json files so pnpm can resolve workspace:* deps
COPY packages/core/package.json ./packages/core/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json
COPY packages/ai/package.json ./packages/ai/package.json
COPY packages/plugins/plugin-stripe/package.json ./packages/plugins/plugin-stripe/package.json
COPY packages/plugins/plugin-mailgun/package.json ./packages/plugins/plugin-mailgun/package.json
COPY packages/plugins/plugin-smtp/package.json ./packages/plugins/plugin-smtp/package.json
COPY packages/plugins/plugin-marketplace-amazon/package.json ./packages/plugins/plugin-marketplace-amazon/package.json
COPY packages/plugins/plugin-marketplace-ebay/package.json ./packages/plugins/plugin-marketplace-ebay/package.json
COPY packages/plugins/plugin-marketplace-kaufland/package.json ./packages/plugins/plugin-marketplace-kaufland/package.json
COPY packages/plugins/plugin-marketplace-otto/package.json ./packages/plugins/plugin-marketplace-otto/package.json
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules 2>/dev/null || true
COPY . .
RUN pnpm --filter @forkcart/api... run build

# ── Stage 3: Production ──
FROM node:22-alpine AS runner
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 forkcart
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
USER forkcart
EXPOSE 4000
CMD ["node", "dist/index.js"]
