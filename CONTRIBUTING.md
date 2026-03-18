# Contributing to ForkCart

Thank you for your interest in contributing to ForkCart! This guide will help you get started.

## Prerequisites

- **Node.js** ≥ 22 (see `.nvmrc`)
- **pnpm** ≥ 9
- **PostgreSQL** 15+
- **Docker** (optional, for local DB)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/forkcart/forkcart.git
cd forkcart

# Install dependencies
pnpm install

# Set up your environment
cp .env.example .env
# Edit .env with your database credentials

# Generate & run migrations
pnpm db:generate
pnpm db:migrate

# Seed the database (optional)
pnpm db:seed

# Start all packages in dev mode
pnpm dev
```

## Monorepo Structure

| Package                | Path                  | Description                                  |
| ---------------------- | --------------------- | -------------------------------------------- |
| `@forkcart/api`        | `packages/api`        | Hono-based REST API                          |
| `@forkcart/core`       | `packages/core`       | Business logic & services                    |
| `@forkcart/database`   | `packages/database`   | Drizzle ORM schemas, migrations & seed       |
| `@forkcart/shared`     | `packages/shared`     | Shared types, constants & validation schemas |
| `@forkcart/storefront` | `packages/storefront` | Next.js storefront                           |
| `@forkcart/admin`      | `packages/admin`      | Admin dashboard                              |

When making changes, work in the most specific package possible. Shared types go in `@forkcart/shared`, database changes in `@forkcart/database`, etc.

## Branch Strategy

- **`main`** — stable, production-ready code
- **`feature/<name>`** — feature branches off `main`
- **`fix/<name>`** — bug fix branches off `main`

Always branch from `main` and open a PR back to `main`.

## Code Style

We use **Prettier** for formatting — no debates about style.

```bash
# Check formatting
pnpm format:check

# Auto-fix formatting
pnpm format
```

Prettier runs automatically on staged files via Husky + lint-staged.

## Making a PR

1. Create a feature/fix branch: `git checkout -b feature/my-change`
2. Make your changes
3. Ensure everything passes:
   ```bash
   pnpm format:check
   pnpm build
   pnpm test        # if applicable
   ```
4. Commit with a descriptive message (conventional commits preferred):
   ```
   feat(api): add bulk product import endpoint
   fix(database): correct price constraint on variants
   ```
5. Push and open a PR against `main`
6. Fill in the PR template and request a review

## Database Changes

All schema changes live in `packages/database/src/schemas/`.

```bash
# After modifying schemas, generate a migration:
cd packages/database
npx drizzle-kit generate

# Apply migrations:
pnpm db:migrate
```

Never edit generated migration files manually.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `NODE_ENV` — `development` | `production`
- `DEMO_MODE` — Set to `true` to enable demo payment endpoints in production

## Need Help?

Open an issue on [GitHub](https://github.com/forkcart/forkcart/issues) or start a discussion.
