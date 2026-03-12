# Contributing to ForkCart

First off — thank you! Whether you're fixing a typo, reporting a bug, or building a new plugin, you're making ForkCart better for everyone. 🎉

## 🛠️ Development Setup

### Prerequisites

- **Node.js 22+** — [Download](https://nodejs.org/)
- **pnpm 9+** — `npm install -g pnpm`
- **PostgreSQL 16** — [Download](https://www.postgresql.org/download/) or use Docker
- **Git**

### Getting Started

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/forkcart.git
cd forkcart

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Create the database
createdb forkcart
# Or: psql -c "CREATE DATABASE forkcart;"

# 5. Run migrations
pnpm db:migrate

# 6. (Optional) Seed demo data
pnpm db:seed

# 7. Start development
pnpm dev
```

This starts all three services:

- **Storefront** → http://localhost:3000
- **Admin Panel** → http://localhost:3001
- **API** → http://localhost:4000

### Useful Commands

```bash
pnpm dev              # Start all packages in dev mode
pnpm build            # Production build (all packages)
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
pnpm typecheck        # TypeScript type checking
pnpm test             # Run tests

pnpm db:generate      # Generate migration from schema changes
pnpm db:migrate       # Apply migrations
pnpm db:seed          # Seed demo data
pnpm db:studio        # Open Drizzle Studio (DB browser)
```

## 📁 Project Structure

```
forkcart/
├── packages/
│   ├── api/            # Hono REST API
│   │   ├── src/
│   │   │   ├── routes/v1/    # Endpoint handlers
│   │   │   └── middleware/   # Auth, error handling
│   │   └── package.json
│   │
│   ├── admin/          # Next.js 15 Admin Panel
│   │   ├── src/app/          # App Router pages
│   │   └── src/components/   # React components
│   │
│   ├── storefront/     # Next.js 15 Customer-facing Shop
│   │   ├── src/app/          # App Router pages
│   │   └── src/components/   # React components
│   │
│   ├── core/           # Business Logic (no HTTP, no DB details)
│   │   ├── src/
│   │   │   ├── products/     # Product service + repository
│   │   │   ├── orders/       # Order service + repository
│   │   │   ├── payments/     # Payment provider interfaces
│   │   │   ├── plugins/      # EventBus, PluginLoader
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── database/       # Drizzle ORM schemas + migrations
│   │   ├── src/schemas/      # Table definitions
│   │   └── drizzle/          # Migration files
│   │
│   ├── shared/         # Shared types, Zod schemas, utils
│   │
│   ├── ai/             # AI provider integrations
│   │
│   └── plugins/
│       └── stripe/     # Stripe payment plugin (reference)
│
├── .env.example
├── turbo.json
└── package.json
```

### Key Principles

- **Business logic lives in `core/`** — services and repositories, no HTTP or framework specifics.
- **Routes live in `api/`** — thin handlers that call services.
- **Plugins are self-contained** — each in its own package under `packages/plugins/`.
- **Types are shared** — common interfaces go in `packages/shared/`.

## 🎨 Code Style

- **TypeScript strict mode** — `strict: true`, no `any`.
- **Prettier** for formatting — runs on commit via lint-staged.
- **ESLint** for linting.
- **Prices in cents** — `2999` means €29.99. Format only in the frontend.

## 🔀 Submitting a Pull Request

1. **Create a branch** from `master`:

   ```bash
   git checkout -b feat/my-awesome-feature
   ```

2. **Make your changes** — keep commits focused and atomic.

3. **Test your changes:**

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

4. **Push and open a PR:**

   ```bash
   git push origin feat/my-awesome-feature
   ```

5. **Describe your changes** — what, why, and how. Include screenshots for UI changes.

### PR Checklist

- [ ] TypeScript compiles without errors
- [ ] Linting passes
- [ ] New features have tests (at minimum service-layer)
- [ ] Documentation updated if needed
- [ ] Follows the commit convention

## 📝 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add product search to admin panel
fix: correct price calculation in cart
docs: update plugin development guide
chore: upgrade drizzle-orm to v0.35
refactor: extract shared validation schemas
style: format with prettier
test: add unit tests for payment service
```

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `test`, `ci`, `perf`

**Scope (optional):** `feat(admin): add bulk product import`

## 🐛 Reporting Bugs

Use our [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) on GitHub. Include:

- Steps to reproduce
- Expected vs. actual behavior
- Environment details (Node version, OS, browser)

## 💡 Feature Requests

Use our [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md). We love hearing what you need!

## 🏗️ Adding a New Feature

Follow this recipe:

1. **Schema** → `packages/database/src/schemas/feature.ts`
2. **Migration** → `cd packages/database && npx drizzle-kit generate`
3. **Repository** → `packages/core/src/feature/repository.ts`
4. **Service** → `packages/core/src/feature/service.ts`
5. **Events** → `packages/core/src/feature/events.ts`
6. **API Route** → `packages/api/src/routes/v1/feature.ts`
7. **Register** → Mount in `packages/api/src/app.ts`
8. **Admin UI** → `packages/admin/src/app/feature/page.tsx`
9. **Tests** → At minimum service-layer tests

## 📜 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Questions? Open a [Discussion](https://github.com/forkcart/forkcart/discussions) or join our [Discord](https://discord.gg/forkcart). We're happy to help! 🚀
