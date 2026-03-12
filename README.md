# 🍴 ForkCart

**AI-First Open Source E-Commerce Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

ForkCart is a modern, modular e-commerce platform built for developers who want full control over their stack. It's designed from the ground up with AI capabilities baked in — not bolted on.

## Why ForkCart?

- **AI-First** — Built-in AI layer for product descriptions, SEO, translations, and image generation. Provider-agnostic: OpenAI, Anthropic, or self-hosted via Ollama.
- **Clean Architecture** — Business logic lives in a pure core package with no HTTP or database dependencies. Testable, composable, swappable.
- **Modern Stack** — TypeScript strict mode, Hono for the API, Drizzle ORM, Next.js 15 for both admin and storefront.
- **Plugin System** — Event-driven architecture with hooks for extending every part of the platform.
- **Developer Experience** — Monorepo with Turborepo, shared Zod schemas, type-safe from database to frontend.

## Architecture

```
┌─────────────┐  ┌─────────────┐
│  Storefront  │  │    Admin    │   Next.js 15 (App Router)
│  (SSR/SSG)   │  │   Panel    │   Tailwind + Shadcn/ui
└──────┬───────┘  └──────┬──────┘
       │                 │
       └────────┬────────┘
                │
         ┌──────▼──────┐
         │   REST API   │              Hono + OpenAPI
         │  /api/v1/*   │
         └──────┬───────┘
                │
         ┌──────▼──────┐
         │    Core      │              Pure business logic
         │  Services    │              Event-driven
         └──────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│  DB   │  │  AI   │  │Plugins│
│Drizzle│  │Layer  │  │System │
└───────┘  └───────┘  └───────┘
```

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for PostgreSQL)

### Setup

```bash
# Clone
git clone https://github.com/forkcart/forkcart.git
cd forkcart

# Install
pnpm install

# Start database
docker compose up -d postgres

# Configure environment
cp .env.example .env

# Run migrations & seed
pnpm db:migrate
pnpm db:seed

# Start everything
pnpm dev
```

### What's Running

| Service    | URL                    | Description           |
|------------|------------------------|-----------------------|
| Storefront | http://localhost:3000   | Customer-facing shop  |
| Admin      | http://localhost:3001   | Management panel      |
| API        | http://localhost:4000   | REST API              |
| DB Studio  | `pnpm db:studio`       | Drizzle Studio        |

**Default admin login:** `admin@forkcart.dev` / `admin123`

## Packages

| Package | Description |
|---------|-------------|
| `@forkcart/shared` | Zod schemas, TypeScript types, utilities |
| `@forkcart/database` | Drizzle ORM schemas, migrations, seeds |
| `@forkcart/core` | Business logic — products, orders, cart, payments |
| `@forkcart/api` | Hono REST API with OpenAPI docs |
| `@forkcart/admin` | Next.js 15 admin panel with Shadcn/ui |
| `@forkcart/storefront` | Next.js 15 SSR storefront |
| `@forkcart/ai` | AI provider abstraction (OpenAI, Anthropic, Ollama) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict) |
| Package Manager | pnpm workspaces |
| Build | Turborepo |
| API | Hono |
| Database | PostgreSQL + Drizzle ORM |
| Frontend | Next.js 15 (App Router) |
| UI Components | Shadcn/ui + Tailwind CSS |
| Validation | Zod |
| Auth | Session-based |
| Testing | Vitest |
| AI | OpenAI / Anthropic / Ollama |

## Project Principles

1. **Dependency Inversion** — Core has zero infrastructure dependencies
2. **Clean Architecture** — Use Cases → Repositories → Database
3. **Event-Driven** — Every significant action emits domain events
4. **Type-Safe** — TypeScript strict + Zod at all boundaries
5. **Modular** — Each module is independently testable
6. **Convention over Configuration** — Sensible defaults, everything configurable

## Docker

```bash
# Start everything (Postgres + API + Admin + Storefront)
docker compose up -d

# Just the database
docker compose up -d postgres
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## License

MIT — see [LICENSE](LICENSE).

---

Built with ❤️ and a healthy disrespect for legacy e-commerce platforms.
