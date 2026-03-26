```
  ___         _     ___          _
 | __|__ _ _ | |__ / __|__ _ _ _| |_
 | _/ _ \ '_|| / /| (__/ _` | '_|  _|
 |_|\___/_|  |_\_\ \___\__,_|_|  \__|
```

**Open source e-commerce. AI-native. Plugin-first. TypeScript end-to-end.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## What is ForkCart?

ForkCart is a modular, self-hosted e-commerce platform built entirely in TypeScript. It ships with a storefront, an admin panel, an API, and a drag-and-drop page builder — all in one monorepo. Payments, emails, shipping, AI, and marketplace integrations are handled through a plugin system inspired by WordPress and Shopware.

No vendor lock-in. No monthly fees. ~65,000 lines of TypeScript.

## Why ForkCart?

Every existing open-source e-commerce platform in TypeScript is headless-only — they give you an API and tell you to build your own frontend. ForkCart ships the entire stack:

|                   | ForkCart        | Medusa.js        | Vendure          | Saleor           | Shopware                |
| ----------------- | --------------- | ---------------- | ---------------- | ---------------- | ----------------------- |
| **Language**      | TypeScript      | TypeScript       | TypeScript       | Python / GraphQL | PHP                     |
| **Storefront**    | ✅ Included     | ❌ Headless only | ❌ Headless only | ❌ Headless only | ✅ Twig                 |
| **Page Builder**  | ✅ Drag & Drop  | —                | —                | —                | ✅ Shopping Experiences |
| **AI Built-in**   | ✅ Native       | —                | —                | —                | Via plugins             |
| **Plugin System** | Interface-based | Modules          | Plugins          | Apps             | Plugins                 |
| **Self-hosted**   | ✅              | ✅               | ✅               | ✅               | ✅                      |
| **License**       | MIT             | MIT              | MIT              | BSD              | MIT                     |

## Features

### Products & Catalog

- Products with variants, options, categories, and image galleries
- Drag-and-drop media management
- Full-text search with ranking (CTR, conversion, recency, popularity, discounts)
- Instant search overlay (Cmd+K) with suggestions
- SEO metadata per product and category (meta title, description, Open Graph)
- Product reviews and ratings
- Wishlists

### Orders & Checkout

- Cart with guest and authenticated checkout
- Coupon codes — percentage, fixed amount, or free shipping with usage limits, expiry, minimum order, and per-customer tracking
- Order management with status tracking (pending → processing → shipped → delivered)
- Customer accounts with order history, address book, and profile management

### Payments

- Plugin-based payment providers — Stripe included as reference implementation
- Payment processing with webhook verification
- Provider settings managed from admin at runtime

### Email

- Transactional email with provider registry (Mailgun, SMTP, console logger)
- Event-driven: order confirmation, shipping, delivery, welcome, password reset
- HTML-escaped templates with dynamic store name
- Email send log viewable in admin

### Tax & Shipping

- Tax zones and rules (percentage and fixed-rate)
- EU VAT validation
- Shipping methods and zones with configurable rates per zone, weight, or order value

### AI (Optional)

- AI-powered product description generation
- Smart search with natural language queries
- Storefront chatbot widget
- Auto-generated SEO metadata
- Provider-agnostic — works with OpenRouter, OpenAI, Anthropic, Google, or any compatible API

### Internationalization

- URL-based locale routing (`/products` = default locale, `/en/products` = secondary locale)
- Product content stored per locale with fallback logic
- Admin translation manager with auto-translate
- GDPR-compliant cookie consent banner with per-locale text configuration
- Multi-currency support

### Page Builder

- Drag-and-drop page builder for all storefront pages
- 20+ block types: Hero, Banner, Product Grid, Category Grid, FAQ, Testimonials, Contact Form, Newsletter, Social Links, Map Embed, and more
- Dynamic page rendering — shop pages (product, cart, checkout, account, search) use page builder layouts with injected live components
- Configurable per page from admin

### Security (Audited March 2026)

- bcrypt password hashing with automatic SHA-256 migration
- Rate limiting on auth, checkout, and search endpoints
- Stripe webhook signature verification
- Input validation with Zod (strict mode) on all endpoints
- XSS protection with HTML entity escaping
- RBAC with role-based route protection
- Secure session secrets and encrypted AI API keys
- Magic-bytes file upload validation

### Admin Panel

- Dashboard with order and revenue overview
- Product, category, customer, and order management
- Plugin activation, configuration, and scheduling
- Drag-and-drop page builder
- Email logs and test sending
- Coupon management with analytics
- Tax zone and shipping method configuration
- Search analytics dashboard
- SEO settings
- AI provider configuration and chatbot settings
- Translation and language management
- Cookie consent settings with locale tabs
- Cache management
- RBAC user management

### Storefront

- Server-rendered pages with Next.js 15
- Page builder-driven layouts
- Product search with filters and instant search
- Shopping cart with coupon input
- Multi-step checkout
- Customer account area
- AI chatbot widget
- Cookie consent banner (GDPR-compliant, locale-aware)
- Locale-aware content rendering

## Tech Stack

| Layer      | Technology                         |
| ---------- | ---------------------------------- |
| API        | Hono (Node.js)                     |
| Admin      | Next.js 15                         |
| Storefront | Next.js 15                         |
| Database   | PostgreSQL, Drizzle ORM            |
| Language   | TypeScript (strict, end-to-end)    |
| Monorepo   | pnpm workspaces, Turborepo         |
| Plugins    | Stripe, Mailgun, SMTP (extensible) |

## Quick Start

```bash
git clone https://github.com/forkcart/forkcart.git
cd forkcart
pnpm install
cp .env.example .env   # configure DATABASE_URL at minimum
pnpm db:migrate
pnpm dev
```

Default ports: **Storefront** on `3000`, **Admin** on `3001`, **API** on `4000`.

Default admin login: `admin@forkcart.dev` / `admin123`

## Project Structure

```
forkcart/
├── packages/
│   ├── api/              Hono REST API
│   ├── admin/            Next.js admin panel
│   ├── storefront/       Next.js storefront with page builder
│   ├── database/         Drizzle ORM schemas & 28 migrations
│   ├── core/             Services, repositories, event bus
│   ├── shared/           Shared types, constants, validation
│   ├── ai/               AI provider registry & interfaces
│   ├── i18n/             Internationalization runtime & locales
│   ├── plugin-sdk/       Plugin interfaces & definePlugin()
│   └── plugins/
│       ├── stripe/       Stripe payment plugin
│       ├── mailgun/      Mailgun email plugin
│       ├── smtp/         SMTP email plugin
│       ├── marketplace-amazon/
│       ├── marketplace-ebay/
│       ├── marketplace-otto/
│       └── marketplace-kaufland/
├── docker-compose.yml    PostgreSQL + pgAdmin
├── turbo.json            Build pipeline
└── Caddyfile             Reverse proxy with auto-SSL
```

### Architecture

```
Client → Hono Route → Service → Repository → Drizzle → PostgreSQL
                          │
                       EventBus → Plugin handlers (payments, emails, etc.)
```

Routes handle HTTP. Services handle business logic. Repositories handle data access. Plugins react to domain events. Each layer only knows about the one below it.

## Plugin System

ForkCart has a WordPress/Shopware-level plugin system. Plugins can extend nearly everything — payments, emails, shipping, storefront UI, admin UI, CLI commands, and scheduled tasks:

```typescript
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  type: 'feature',

  // Auto-generates admin settings UI
  settings: {
    apiKey: { type: 'string', required: true, secret: true },
  },

  // React to domain events
  events: {
    'order:created': async (order) => {
      /* notify, sync, etc. */
    },
  },

  // Transform data (like WordPress apply_filters)
  filters: {
    'product:price': (price) => price * 0.9,
  },

  // Inject HTML into storefront slots
  storefrontSlots: [{ slot: 'header-after', content: '<div>Announcement!</div>' }],

  // CLI commands
  cli: [
    {
      name: 'sync',
      handler: async () => {
        /* ... */
      },
    },
  ],

  // Cron jobs
  scheduledTasks: [
    {
      name: 'cleanup',
      schedule: '0 3 * * *',
      handler: async () => {
        /* ... */
      },
    },
  ],
});
```

**Plugin types:** `payment` · `marketplace` · `email` · `shipping` · `feature`

📖 **[Full Plugin Documentation →](docs/PLUGINS.md)**

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
pnpm install
pnpm dev          # Start all services
pnpm build        # Build everything
pnpm format:check # Check formatting
pnpm lint         # Lint
```

## License

[MIT](LICENSE)
