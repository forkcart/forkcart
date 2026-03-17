```
  ___         _     ___          _
 | __|__ _ _ | |__ / __|__ _ _ _| |_
 | _/ _ \ '_|| / /| (__/ _` | '_|  _|
 |_|\___/_|  |_\_\ \___\__,_|_|  \__|
```

**Open source e-commerce. AI-native. Plugin-first. TypeScript end-to-end.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## What is ForkCart?

ForkCart is a modular, self-hosted e-commerce platform with built-in AI capabilities and an interface-based plugin system. Products, orders, payments, shipping, emails, and AI integrations all work out of the box. Everything is swappable — no vendor lock-in, no monthly fees.

## Features

**Products and Catalog**

- Products with variants, categories, image galleries, and drag-and-drop media management
- Full-text search with search analytics and suggestions
- SEO metadata per product and category (meta title, description, Open Graph)
- Multi-language support with configurable default language — product content stored per locale

**Orders and Checkout**

- Cart with guest and authenticated checkout
- Coupon/discount codes — percentage, fixed amount, or free shipping with usage limits, expiry dates, and minimum order amounts
- Order management with status tracking (pending, processing, shipped, delivered, cancelled)
- Customer accounts with order history, address book, and profile management

**Payments**

- Plugin-based payment providers — Stripe included as reference implementation
- Payment processing with webhook support for async confirmation
- Provider settings managed from the admin panel at runtime

**Email**

- Transactional email system with provider registry (Mailgun, SMTP, or console logger for development)
- Event-driven: order confirmation, shipping notification, delivery notification, welcome email, password reset
- Email templates with dynamic store name
- Email log with send history viewable in admin

**Tax**

- Tax zones and rules with support for percentage and fixed-rate taxes
- EU VAT validation
- Tax settings configurable per zone and product category

**Shipping**

- Shipping methods and zones
- Configurable rates per zone, weight, or order value

**AI (optional)**

- AI-powered product description generation
- Smart search with natural language queries
- Storefront chatbot
- Auto-generated SEO metadata
- Provider-agnostic — works with OpenRouter, OpenAI, Anthropic, or any compatible API

**Internationalization**

- Multi-language admin and storefront
- Dynamic default language (stored in database, not hardcoded)
- Product translations with fallback logic — empty strings are preserved, only null values fall back
- Language management in admin with default language selection

**Admin Panel**

- Dashboard with order and revenue overview
- Product, category, customer, and order management
- Plugin activation and configuration
- Email logs and test sending
- Coupon management
- Tax zone and rule configuration
- Shipping method setup
- Search analytics
- SEO settings
- AI provider configuration
- Chatbot settings
- Translation and language management
- Cache management

**Storefront**

- Server-rendered product pages and category listings
- Product search with filters
- Shopping cart with coupon code input
- Multi-step checkout
- Customer account area (orders, addresses, profile)
- AI chatbot widget
- Locale-aware content rendering

## Tech Stack

| Layer      | Technology                         |
| ---------- | ---------------------------------- |
| API        | Hono (Node.js)                     |
| Admin      | Next.js 15, TanStack Query         |
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

Default ports: storefront on `3000`, admin on `3001`, API on `4000`.

## Project Structure

```
forkcart/
  packages/
    api/             Hono REST API
    admin/           Next.js admin panel
    storefront/      Next.js storefront
    database/        Drizzle ORM schemas and migrations
    core/            Business logic — services, repositories, event bus
    shared/          Shared types, constants, utilities
    ai/              AI provider registry and interfaces
    i18n/            Internationalization runtime
    plugins/
      stripe/        Stripe payment plugin
      mailgun/       Mailgun email plugin
      smtp/          SMTP email plugin
```

**Request flow:**

```
Client -> Hono Route -> Service -> Repository -> Drizzle -> PostgreSQL
                           |
                        EventBus -> Plugin handlers (payments, emails, etc.)
```

Routes handle HTTP. Services handle business logic. Repositories handle data access. Plugins react to domain events. Each layer only knows about the one below it.

## Plugin System

ForkCart has a WordPress/Shopware-level plugin system. Plugins can extend nearly everything:

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

  // React to events
  events: {
    'order:created': async (order) => { /* ... */ },
  },

  // Transform data (like WordPress apply_filters)
  filters: {
    'product:price': (price) => price * 0.9, // 10% off
  },

  // Inject HTML into storefront
  storefrontSlots: [
    { slot: 'header-after', content: '<div>Announcement!</div>' },
  ],

  // CLI commands
  cli: [
    { name: 'sync', handler: async () => { /* ... */ } },
  ],

  // Cron jobs
  scheduledTasks: [
    { name: 'cleanup', schedule: '0 3 * * *', handler: async () => { /* ... */ } },
  ],
});
```

**Plugin types:** `payment`, `marketplace`, `email`, `shipping`, `feature`

**Built-in plugins:** Stripe, Mailgun, SMTP, Amazon, eBay, Otto, Kaufland

📖 **[Full Plugin Documentation →](docs/PLUGINS.md)**

## Database

PostgreSQL with Drizzle ORM. Migrations are numbered SQL files in `packages/database/src/migrations/`. Current schema includes tables for products, product translations, categories, orders, customers, carts, payments, coupons, plugins, plugin settings, email logs, shipping, tax zones, tax rules, search analytics, SEO metadata, AI settings, chatbot sessions, users, media, and languages.

## Comparison

|                | ForkCart        | Shopify     | Medusa     | Saleor  |
| -------------- | --------------- | ----------- | ---------- | ------- |
| Open Source    | MIT             | No          | MIT        | BSD     |
| AI built-in    | Yes             | Paid apps   | No         | No      |
| Plugin system  | Interface-based | App Store   | Modules    | Apps    |
| Self-hosted    | Yes             | No          | Yes        | Yes     |
| Vendor lock-in | None            | Full        | Partial    | Partial |
| Language       | TypeScript      | Ruby/Liquid | TypeScript | Python  |

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
