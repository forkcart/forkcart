<p align="center">
  <img src="brand/logo-green-400w.png" alt="ForkCart" width="280" />
</p>

<h3 align="center">Open-source e-commerce. TypeScript end-to-end.</h3>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-blue.svg" alt="TypeScript" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-black.svg" alt="Next.js 16" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
</p>

---

## What is ForkCart?

The only open-source TypeScript e-commerce platform that ships **storefront + admin + API + mobile app** in one monorepo. Plugin-first architecture. AI-native. No vendor lock-in.

**[Live Demo (Shop)](https://forkcart.heynyx.dev)** · **[Admin Demo](https://forkcart-admin.heynyx.dev)** (login: `admin@forkcart.dev` / `admin123`)

---

## Quick Start

```bash
git clone https://github.com/forkcart/forkcart.git
cd forkcart
pnpm install
cp .env.example .env        # set DATABASE_URL
pnpm db:migrate && pnpm dev
```

Storefront → `localhost:3000` · Admin → `localhost:3001` · API → `localhost:4000`

---

## Why ForkCart?

Every TypeScript e-commerce is headless-only — API without frontend. ForkCart ships the entire stack:

|                   | ForkCart        | Medusa.js        | Vendure          | Saleor           | Shopware         |
| ----------------- | --------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| **Language**      | TypeScript      | TypeScript       | TypeScript       | Python / GraphQL | PHP              |
| **Storefront**    | ✅ Included     | ❌ Headless only | ❌ Headless only | ❌ Headless only | ✅ Twig          |
| **Page Builder**  | ✅ Drag & Drop  | —                | —                | —                | ✅ Shopping Exp. |
| **AI Built-in**   | ✅ Native       | —                | —                | —                | Via plugins      |
| **Mobile App**    | ✅ Expo         | —                | —                | —                | —                |
| **Plugin System** | Interface-based | Modules          | Plugins          | Apps             | Plugins          |
| **Self-hosted**   | ✅              | ✅               | ✅               | ✅               | ✅               |
| **License**       | MIT             | MIT              | MIT              | BSD              | MIT              |

---

## Features

### 🛍️ Products & Catalog

Variants, options, categories, image galleries, full-text search with CTR/conversion ranking, instant search (Cmd+K), SEO metadata, reviews, wishlists.

### 🛒 Orders & Checkout

Guest + authenticated checkout, coupon codes (percentage, fixed, free shipping), order lifecycle tracking, customer accounts with order history and address book.

### 💳 Payments & Email

Plugin-based payment providers (Stripe included). Transactional emails via Mailgun, SMTP, or custom providers. Event-driven: order confirmation, shipping, delivery, password reset.

### 🤖 AI (Optional)

Product description generation, smart search, storefront chatbot, auto-generated SEO. Provider-agnostic — OpenRouter, OpenAI, Anthropic, Google, or any compatible API.

### 🎨 Page Builder

20+ block types. Drag-and-drop editing for every page. Dynamic shop pages with live components. Configurable from admin.

### 🌍 Internationalization

URL-based locale routing, per-locale product content with fallback, admin translation manager with auto-translate, multi-currency, GDPR cookie consent per locale.

### 🔌 Plugins

WordPress/Shopware-level extensibility. Payments, emails, shipping, UI slots, admin pages, CLI commands, cron jobs, custom routes, database migrations — all via `definePlugin()`.

### 🔒 Security

bcrypt + SHA-256 migration, rate limiting, Stripe webhook verification, Zod validation (strict), XSS protection, RBAC, encrypted API keys, magic-bytes upload validation.

---

## Tech Stack

| Layer    | Technology           | Version |
| -------- | -------------------- | ------- |
| API      | Hono                 | ^4.6    |
| Frontend | Next.js              | ^16.2   |
| Mobile   | Expo + React Native  | SDK 52  |
| Database | PostgreSQL + Drizzle | 16      |
| Language | TypeScript (strict)  | ^5.7    |
| Styling  | Tailwind CSS         | ^4      |
| Build    | Turborepo + pnpm     | ^2.3    |
| Testing  | Vitest               | ^2.1    |

---

## Plugin System

```typescript
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  type: 'feature',

  settings: {
    apiKey: { type: 'string', required: true, secret: true },
  },

  events: {
    'order:created': async (order) => {
      // notify, sync, transform — anything
    },
  },

  filters: {
    'product:price': (price) => price * 0.9, // 10% off everything
  },

  storefrontSlots: [{ slot: 'header-after', content: '<div>Free shipping today!</div>' }],

  scheduledTasks: [{ name: 'cleanup', schedule: '0 3 * * *', handler: async () => {} }],
});
```

**Plugin types:** `payment` · `marketplace` · `email` · `shipping` · `analytics` · `general`

Plugins can also register custom API routes, admin pages, CLI commands, and database migrations.

📖 **[Full Plugin Docs →](docs/PLUGINS.md)**

---

## Plugin Store

Build plugins. Sell them. **Keep 90% — only 10% commission.**

→ [forkcart.com/store](https://forkcart.com/store)

---

## Self-Hosting

### Docker (recommended)

```bash
git clone https://github.com/forkcart/forkcart.git
cd forkcart
cp .env.example .env
docker compose up
```

### Manual

```bash
# Prerequisites: Node.js ≥ 22, pnpm ≥ 9, PostgreSQL 16
pnpm install
pnpm db:migrate
pnpm db:seed        # optional demo data
pnpm build
pnpm start
```

Use the included `Caddyfile` for reverse proxy with auto-SSL.

---

## Project Structure

```
forkcart/
├── packages/
│   ├── api/            # Hono REST API
│   ├── admin/          # Next.js admin dashboard
│   ├── storefront/     # Next.js storefront + page builder
│   ├── mobile/         # Expo / React Native app
│   ├── core/           # Services, repositories, event bus
│   ├── database/       # Drizzle ORM, 30 migrations, ~33 tables
│   ├── shared/         # Zod schemas, types, error classes
│   ├── ai/             # AI provider registry
│   ├── i18n/           # Locale files + React hooks
│   ├── plugin-sdk/     # Published to npm
│   ├── cli/            # `forkcart` CLI tool
│   └── plugins/        # Stripe, Mailgun, SMTP, marketplaces
├── docker-compose.yml
├── turbo.json
└── Caddyfile
```

---

## Contributing

Contributions welcome. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for guidelines.

```bash
pnpm dev            # Start all services
pnpm build          # Build everything
pnpm test           # Run tests
pnpm format:check   # Check formatting
pnpm lint           # Lint
```

---

## Community

- 💬 [GitHub Discussions](https://github.com/forkcart/forkcart/discussions)
- 🐛 [Issues](https://github.com/forkcart/forkcart/issues)

---

## License

[MIT](LICENSE) — do whatever you want.
