FROM node:22-alpine AS base
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @forkcart/shared build
RUN pnpm --filter @forkcart/i18n build
RUN pnpm --filter @forkcart/storefront build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/storefront/.next/standalone ./
COPY --from=builder /app/packages/storefront/.next/static ./packages/storefront/.next/static
COPY --from=builder /app/packages/storefront/public ./packages/storefront/public

EXPOSE 3000
CMD ["node", "packages/storefront/server.js"]
