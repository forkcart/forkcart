# ForkCart — Technische Architektur

## Übersicht

ForkCart ist eine AI-native E-Commerce Plattform. Monorepo mit pnpm + Turborepo.

```
forkcart/
├── packages/
│   ├── api/           → Hono REST API (Port 4000)
│   ├── admin/         → Next.js 15 Admin Panel (Port 3001)
│   ├── storefront/    → Next.js 15 Storefront (Port 3000)
│   ├── database/      → Drizzle ORM + PostgreSQL Schemas
│   ├── core/          → Business Logic (Services, Repositories, Events)
│   ├── shared/        → Types, Constants, Utils (shared across packages)
│   └── ai/            → AI Providers (OpenAI, Anthropic, Ollama)
```

## Tech Stack

| Layer          | Technologie                                  |
| -------------- | -------------------------------------------- |
| **API**        | Hono (lightweight, fast)                     |
| **Admin**      | Next.js 15, React Query, Tailwind, shadcn/ui |
| **Storefront** | Next.js 15, SSR, Tailwind                    |
| **DB**         | PostgreSQL 16 + Drizzle ORM                  |
| **AI**         | OpenAI / Anthropic / Ollama (pluggable)      |
| **Monorepo**   | pnpm workspaces + Turborepo                  |
| **Runtime**    | Node.js 22                                   |

## Server & URLs

| Service    | Intern         | Extern                            |
| ---------- | -------------- | --------------------------------- |
| API        | localhost:4000 | https://forkcart-api.heynyx.dev   |
| Admin      | localhost:3001 | https://forkcart-admin.heynyx.dev |
| Storefront | localhost:3000 | https://forkcart.heynyx.dev       |
| PostgreSQL | localhost:5432 | nur lokal                         |

**Caddy** = Reverse Proxy mit Auto-SSL für alle Subdomains.

## Datenbank-Schema

### Tabellen (alle mit UUID PKs)

```
products              → Hauptprodukte (name, slug, sku, price in CENTS, status)
product_variants      → Varianten (size, color etc.)
product_attributes    → Attribute-Definitionen
product_categories    → Junction: Product ↔ Category (M:N)
categories            → Baumstruktur (parentId für Hierarchie)
customers             → Endkunden (email, name, orderCount, totalSpent)
addresses             → Kundenadressen (1:N zu customers)
carts                 → Warenkörbe (sessionId ODER customerId)
cart_items            → Warenkorb-Positionen
orders                → Bestellungen (orderNumber, status, totals)
order_items           → Bestellpositionen
order_status_history  → Statusänderungen mit Timestamp
payments              → Zahlungen (provider, externalId, status)
shipping_methods      → Versandarten (price, estimatedDays)
tax_rules             → Steuerregeln (country, rate)
media                 → Medien/Bilder (entityType + entityId polymorphic)
users                 → Admin-Benutzer (role, passwordHash)
plugins               → Plugin-Registry (name, version, isActive)
```

**⚠️ PREISE SIND IN CENTS!** `price: 2999` = €29,99

### Migrationen

- Tool: `drizzle-kit generate` → `pnpm migrate`
- Dateien: `packages/database/drizzle/`
- **NIE** Tabellen direkt ändern — immer Schema editieren → Migration generieren

## API-Architektur (Clean Architecture)

```
Request → Hono Route → Service → Repository → Drizzle → PostgreSQL
                          ↓
                       EventBus (async side effects)
```

### Packages und ihre Rollen

**`packages/core/`** — Business Logic (KEIN HTTP, KEINE DB-Details)

- `services/` → Business Rules (ProductService, CategoryService, etc.)
- `repositories/` → Interfaces + Implementierungen für DB-Zugriff
- `events/` → Domain Events (product.created, order.placed, etc.)
- `plugins/` → EventBus für lose Kopplung

**`packages/api/`** — HTTP Layer

- `routes/v1/` → REST Endpoints (Hono Router)
- `middleware/` → Auth, Error Handling, Validation
- Dependency Injection: Routes bekommen Services, nicht direkt DB

**`packages/database/`** — Persistenz

- `schemas/` → Drizzle Table Definitions
- `seeds/` → Test/Demo-Daten
- `connection.ts` → DB Connection Pool

**`packages/shared/`** — Cross-Package Types

- `types/` → TypeScript Interfaces
- `schemas/` → Zod Validation Schemas
- `utils/` → Formatierung, Helpers

### API-Konventionen

```
GET    /api/v1/{resource}          → List (mit Pagination)
GET    /api/v1/{resource}/:id      → Detail
POST   /api/v1/{resource}          → Create
PUT    /api/v1/{resource}/:id      → Update
DELETE /api/v1/{resource}/:id      → Delete
```

Response-Format:

```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

### Admin API-Client

- `packages/admin/src/lib/api-client.ts`
- Basis-URL: `NEXT_PUBLIC_API_URL` (env)
- Prefixed alle Pfade mit `/api/v1`
- React Query für Caching + Mutations

## Konventionen für Bienen 🐝

### DO ✅

- Immer in der richtigen Package arbeiten (Business Logic → core, HTTP → api, UI → admin/storefront)
- Preise in Cents speichern, nur im Frontend formatieren
- Neue Tabellen: Schema in `packages/database/src/schemas/` → re-export in `index.ts`
- Neue Routes: eigene Datei in `packages/api/src/routes/v1/`
- Services: Constructor Injection (Repository + EventBus)
- Events feuern nach Writes (product.created, order.placed etc.)
- TypeScript strict mode — no `any`

### DON'T ❌

- KEINE direkte DB-Zugriffe in Routes (immer über Service → Repository)
- KEINE Business Logic in API Routes
- KEINE hardcodierten URLs (immer env vars)
- KEIN `localhost` in Client-Side Code (immer `NEXT_PUBLIC_*` env)
- KEINE Schema-Änderungen ohne Migration
- NICHT `packages/admin` im dev mode laufen lassen (Production Build!)

### Neue Feature hinzufügen (Rezept)

1. **Schema** → `packages/database/src/schemas/{feature}.ts`
2. **Migration** → `cd packages/database && npx drizzle-kit generate`
3. **Repository** → `packages/core/src/{feature}/repository.ts`
4. **Service** → `packages/core/src/{feature}/service.ts`
5. **Events** → `packages/core/src/{feature}/events.ts`
6. **API Route** → `packages/api/src/routes/v1/{feature}.ts`
7. **Mount** → In `packages/api/src/app.ts` registrieren
8. **Admin UI** → `packages/admin/src/app/{feature}/page.tsx`
9. **Tests** → Mindestens Service-Layer testen
10. **Build** → `cd packages/admin && npx next build` (NICHT vergessen!)

### Nach Änderungen am Admin

```bash
cd packages/admin
npx next build          # PFLICHT! Dev mode ist 25x langsamer
fuser -k 3001/tcp
npx next start --port 3001
```
