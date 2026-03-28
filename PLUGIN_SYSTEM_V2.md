# ForkCart Plugin System v2 — Design Doc

## Problem

Plugins write raw SQL against core tables and guess column types.
Tyto's smart-recs plugin used VARCHAR for product IDs → PostgreSQL rejects `uuid = varchar` JOINs.

## What Others Do

**Shopware 6:** Full DAL (Data Abstraction Layer). Plugins define typed EntityDefinitions with FkField referencing ProductDefinition. Migrations auto-generated. Overkill but bulletproof.

**WordPress:** Raw SQL via dbDelta(). No foreign keys. Works because everything is BIGINT. Not a role model.

**Medusa.js:** Drizzle/Mikro-ORM entities. Plugins extend core entities with typed relations. Better than WP but complex.

## Our Approach: Schema-Aware Plugin SDK

Three layers, each independently useful:

### 1. `schema` — Core Table Introspection (MUST HAVE)

Plugin SDK exposes a typed schema object so plugins know exact column types.

```ts
import { schema } from '@forkcart/plugin-sdk';

// schema.products.id → { type: 'uuid', nullable: false }
// schema.products.name → { type: 'text', nullable: false }
// schema.orders.totalAmount → { type: 'numeric', nullable: false }
```

No more guessing. Auto-generated from our Drizzle schema.

### 2. `ref()` — Typed Foreign Key Helper (MUST HAVE)

Instead of raw VARCHAR columns, plugins declare references:

```ts
migrations: [
  {
    version: '1.0.0',
    up: async (db, { ref }) => {
      await db.execute(`
      CREATE TABLE plugin_smart_recs_manual (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_product_id ${ref('products.id')} NOT NULL,
        recommended_product_id ${ref('products.id')} NOT NULL,
        sort_order INTEGER DEFAULT 0
      )
    `);
    },
  },
];
```

`ref('products.id')` resolves to `UUID` at migration time. Type-safe, no guessing.

### 3. `query()` — Type-Safe Core Table Queries (NICE TO HAVE)

Higher-level query builder that handles JOINs correctly:

```ts
// Instead of raw SQL with manual JOINs:
const recs = await ctx
  .query('products')
  .select('id', 'name', 'price')
  .where({ id: { in: productIds } })
  .limit(10);
```

Auto-handles UUID casting, respects permissions. Phase 2.

### 4. Migration Validator (MUST HAVE)

On plugin install, validate migration SQL:

- Detect references to core tables
- Warn if column types don't match
- Suggest `ref()` usage

### 5. Schema Export for Plugin Devs

`npx forkcart schema:export` → generates `forkcart-schema.d.ts` with all core table types.

## Implementation Plan

### Phase 1 (Tonight): ref() + schema + validator

1. Generate schema map from Drizzle definitions
2. Add `ref()` helper to migration context
3. Add type validator that catches uuid/varchar mismatches
4. Update Plugin SDK types
5. Update docs

### Phase 2 (Later): query() builder

1. Type-safe query builder over ScopedDatabase
2. Auto-casting for cross-table JOINs
3. Relation-aware queries

## Naming

- `ref()` not `FkField` — we're not Java
- `schema` not `EntityDefinition` — it's a lookup, not a class
- `query()` not `Repository` — it's a function, not a pattern
