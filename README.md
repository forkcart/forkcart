```
  ___         _     ___          _
 | __|__ _ _ | |__ / __|__ _ _ _| |_
 | _/ _ \ '_|| / /| (__/ _` | '_|  _|
 |_|\___/_|  |_\_\ \___\__,_|_|  \__|
```

**The AI-native e-commerce platform. Open source. Plugin-first. Built for builders.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Discord](https://img.shields.io/badge/Discord-Join%20us-7289da.svg)](https://discord.gg/forkcart)

---

## What is ForkCart?

ForkCart is a modular, open source e-commerce platform built from the ground up with AI capabilities and a plugin-first architecture. No vendor lock-in. Swap out payments, shipping, or AI providers without touching your core code. Own your store, own your data.

## ✨ Features

- 🔌 **Plugin System** — Payments, shipping, AI — everything is swappable. Write a plugin in 50 lines.
- 🤖 **AI-native** — Product descriptions, smart search, chatbot, auto-categorization — AI is a first-class citizen, not a bolt-on.
- 🛒 **Full Shop** — Products, categories, cart, checkout, orders — the whole deal.
- 📊 **Admin Panel** — Dashboard, product management, customers, orders, plugin settings — all in one place.
- 🖼️ **Media Management** — Image uploads, product galleries, drag & drop.
- 🔐 **Auth** — JWT-based authentication with role-based access control.
- 💳 **Payment Plugins** — Stripe included. PayPal and Klarna coming soon.
- 📦 **Modern Stack** — Next.js 15, Hono, Drizzle ORM, PostgreSQL, TypeScript end-to-end.

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/forkcart/forkcart.git
cd forkcart

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL

# 4. Run migrations
pnpm db:migrate

# 5. Start development
pnpm dev
```

The storefront runs on `http://localhost:3000`, admin on `http://localhost:3001`, and the API on `http://localhost:4000`.

## 🏗️ Architecture

ForkCart is a monorepo powered by pnpm workspaces and Turborepo:

```
forkcart/
├── packages/
│   ├── api/            # Hono REST API (Port 4000)
│   ├── admin/          # Next.js 15 Admin Panel (Port 3001)
│   ├── storefront/     # Next.js 15 Storefront (Port 3000)
│   ├── database/       # Drizzle ORM + PostgreSQL schemas
│   ├── core/           # Business logic — services, repositories, events
│   ├── shared/         # Types, constants, utils shared across packages
│   ├── ai/             # AI providers (OpenAI, Anthropic, Ollama)
│   └── plugins/
│       └── stripe/     # Stripe payment plugin (reference implementation)
```

**Request flow:**

```
Client → Hono Route → Service → Repository → Drizzle → PostgreSQL
                         ↓
                      EventBus → Plugin handlers
```

Clean architecture: routes don't touch the database, services don't know about HTTP, and plugins react to domain events.

## 🔌 Plugin System

ForkCart's plugin system is interface-based. Every payment provider, shipping method, or AI integration implements a well-defined TypeScript interface. The `PluginLoader` handles registration, activation, and settings — all managed from the admin panel.

```typescript
// That's all it takes to define a plugin
export const myPlugin: PluginDefinition = {
  name: 'my-payment',
  version: '1.0.0',
  description: 'My custom payment provider',
  author: 'You',
  type: 'payment',
  createProvider: () => new MyPaymentProvider(),
};
```

Plugins are activated/deactivated at runtime. Settings are stored in the database and configurable through the admin UI.

👉 **[Full Plugin Development Guide →](docs/plugins.md)**

## 🆚 Why ForkCart?

| | ForkCart | Shopify | Medusa | Saleor |
|---|---|---|---|---|
| **Open Source** | ✅ MIT | ❌ | ✅ | ✅ |
| **AI-native** | ✅ Built-in | 💰 Apps | ❌ DIY | ❌ DIY |
| **Plugin System** | ✅ Interface-based | 🔒 App Store | 🟡 Modules | 🟡 Apps |
| **Self-hosted** | ✅ | ❌ | ✅ | ✅ |
| **Vendor Lock-in** | ❌ None | 🔒 Full | 🟡 Some | 🟡 Some |
| **TypeScript** | ✅ End-to-end | ❌ Ruby/Liquid | ✅ | ✅ Python |

## 📸 Screenshots

<!-- TODO: Add screenshots -->
<p align="center">
  <em>Admin Panel — coming soon</em>
</p>

<p align="center">
  <em>Storefront — coming soon</em>
</p>

## 🤝 Contributing

We'd love your help! Whether it's fixing a bug, adding a feature, or improving docs — every contribution matters.

👉 **[Read the Contributing Guide →](CONTRIBUTING.md)**

## 📖 Documentation

- [Plugin Development Guide](docs/plugins.md)
- [Self-Hosting Guide](docs/self-hosting.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Feature Checklist](FEATURES.md)

## 📄 License

[MIT](LICENSE) © 2026 ForkCart Contributors

---

<p align="center">
  Built with 🦞 by the ForkCart community
</p>
