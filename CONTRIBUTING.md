# Contributing to ForkCart

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **Docker** (for PostgreSQL)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/forkcart/forkcart.git
cd forkcart

# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d postgres

# Run database migrations
pnpm db:migrate

# Seed with sample data
pnpm db:seed

# Start all services in dev mode
pnpm dev
```

This starts:
- **API** on `http://localhost:4000`
- **Admin** on `http://localhost:3001`
- **Storefront** on `http://localhost:3000`

## Project Structure

```
packages/
├── shared/     → Zod schemas, types, utils (shared across all packages)
├── database/   → Drizzle ORM schemas, migrations, seeds
├── core/       → Business logic (no HTTP/DB dependencies)
├── api/        → Hono REST API server
├── admin/      → Next.js admin panel
├── storefront/ → Next.js storefront
└── ai/         → AI provider abstraction layer
```

## Code Standards

- **TypeScript strict mode** — no `any` types, ever
- **Zod validation** at all boundaries (API inputs, form data)
- **Barrel exports** via `index.ts` in every module
- **Clean Architecture** — core logic has no infrastructure dependencies
- **Structured logging** with pino

## Making Changes

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feature/your-feature`
3. **Make changes** following the code standards above
4. **Run checks**: `pnpm typecheck && pnpm lint && pnpm test`
5. **Commit** with a clear message: `feat: add product search`
6. **Open a PR** against `main`

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code change that neither fixes nor adds
- `test:` — adding or updating tests
- `chore:` — maintenance tasks

## Adding a New Core Module

1. Create the module directory: `packages/core/src/your-module/`
2. Add the required files: `types.ts`, `service.ts`, `repository.ts`, `events.ts`, `index.ts`
3. Add corresponding database schema in `packages/database/src/schemas/`
4. Add shared Zod schemas in `packages/shared/src/schemas/`
5. Wire up API routes in `packages/api/src/routes/v1/`
6. Export from parent `index.ts` files

## Need Help?

Open an issue or start a discussion. We're happy to help!
