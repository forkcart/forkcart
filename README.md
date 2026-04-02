<p align="center">
  <img src="brand/logo-green-400w.png" alt="ForkCart" width="280" />
</p>

<h3 align="center">The open-source e-commerce platform with everything included.</h3>

<p align="center">
  <a href="https://github.com/forkcart/forkcart"><img src="https://img.shields.io/github/stars/forkcart/forkcart?style=social" alt="GitHub Stars" /></a>
  <a href="https://github.com/forkcart/forkcart/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/forkcart/forkcart/ci.yml?branch=main&label=CI" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-blue.svg" alt="TypeScript" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-black.svg" alt="Next.js 16" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
</p>

---

## What is ForkCart?

The only open-source TypeScript e-commerce platform that ships **storefront + admin + API + mobile app** in one monorepo. Full-stack, plugin-first, AI-ready. No vendor lock-in.

**[Live Demo](https://forkcart.heynyx.dev)** (Shop + Admin at `/admin`)

<!-- Screenshots coming soon: Admin Dashboard, Storefront, PageBuilder, Plugin Store -->

---

## Quick Start

```bash
npx create-forkcart my-shop
```

Or with a single script:

```bash
curl -fsSL https://forkcart.com/install.sh | bash
```

That’s it. The web installer handles database setup, admin account, and demo data.

Your store runs on **one port**:

- `/` — Storefront
- `/admin` — Admin panel
- `/api/*` — REST API

---

## Why ForkCart?

Every TypeScript e-commerce is headless-only — API without frontend. ForkCart ships the entire stack:

|                    | ForkCart                 | Medusa.js        | Vendure          | Saleor           | Shopware         |
| ------------------ | ------------------------ | ---------------- | ---------------- | ---------------- | ---------------- |
| **Language**       | TypeScript               | TypeScript       | TypeScript       | Python / GraphQL | PHP              |
| **Storefront**     | ✅ Included              | ❌ Headless only | ❌ Headless only | ❌ Headless only | ✅ Twig          |
| **Page Builder**   | ✅ Drag & Drop           | —                | —                | —                | ✅ Shopping Exp. |
| **AI Built-in**    | ✅ Native                | —                | —                | —                | Via plugins      |
| **Mobile App**     | ✅ Expo                  | —                | —                | —                | —                |
| **Plugin System**  | SDK + Store + Hot Reload | Modules          | Plugins          | Apps             | Plugins          |
| **Plugin Dev CLI** | ✅ `plugin:dev`          | —                | —                | —                | —                |
| **CSS Isolation**  | ✅ Scoped                | —                | —                | —                | —                |
| **Self-hosted**    | ✅                       | ✅               | ✅               | ✅               | ✅               |
| **License**        | MIT                      | MIT              | MIT              | BSD              | MIT              |

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

Developer-first plugin system with everything you'd expect — and things you wouldn't:

- **`definePlugin()`** — single entry point, full TypeScript autocomplete
- **Typed Events** — `hooks` with typed payloads, filters for data transformation
- **Storefront Pages** — plugins can build their own pages (`/ext/blog`, `/ext/wishlist`)
- **ScopedDatabase** — permission-aware DB access with rate limiting & slow query logging
- **CSS Isolation** — scoped styles so plugins never break your theme
- **Settings Groups** — organize complex plugin settings into tabs
- **Hot Reload** — file watcher in dev, instant feedback
- **Plugin Dev CLI** — `npx forkcart plugin:dev <slug>` for watch + build + reload
- **Preview Sandbox** — inspect slots, blocks, and admin widgets before going live
- **Plugin Store** — publish, sell, install. **You keep 90%, we take 10%.**

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
  type: 'general',

  settings: {
    apiKey: { type: 'string', required: true, secret: true },
  },

  hooks: {
    'order:created': async (event, ctx) => {
      // notify, sync, transform — anything
    },
  },

  filters: {
    'product:price': (price) => price * 0.9, // 10% off everything
  },

  storefrontSlots: [{ slot: 'header-after', content: '<div>Free shipping today!</div>' }],

  storefrontPages: [
    {
      path: '/wishlist',
      title: 'My Wishlist',
      content: '<div id="wishlist">Loading...</div>',
      showInNav: true,
      navIcon: '❤️',
      requireAuth: true,
    },
  ],

  scheduledTasks: [{ name: 'cleanup', schedule: '0 3 * * *', handler: async () => {} }],
});
```

**Plugin types:** `payment` · `marketplace` · `email` · `shipping` · `analytics` · `general`

Plugins can also register custom API routes, admin pages, CLI commands, PageBuilder blocks, and database migrations.

📖 **[Full Plugin Docs →](docs/PLUGINS.md)** · **[Architecture →](docs/ARCHITECTURE.md)**

---

## Plugin Store

Build plugins. Sell them. **Keep 90% — only 10% commission.**

→ [forkcart.com/store](https://forkcart.com/store)

---

## Self-Hosting

### Web Installer (recommended)

```bash
npx create-forkcart my-shop
# Open localhost:4200 and follow the wizard
```

### Manual

```bash
# Prerequisites: Node.js ≥ 22, pnpm ≥ 9, PostgreSQL 16
git clone --branch v0.1.0 --depth 1 https://github.com/forkcart/forkcart.git
cd forkcart
pnpm install
pnpm installer     # or: cp .env.example .env && pnpm db:migrate && pnpm build
pnpm start
```

> ⚠️ Always clone a release tag (`v0.1.0`), not `main`. The main branch is active development.

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

---

<p align="center">Built with ❤️ by Fabian & Nyx 🦞</p>
