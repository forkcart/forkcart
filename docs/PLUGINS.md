# ForkCart Plugin Developer Guide

Build plugins that extend ForkCart — payment providers, marketplaces, email services, shipping, analytics, and custom features. This guide covers everything from your first plugin to publishing on the Plugin Store.

---

## Table of Contents

- [Introduction](#introduction)
- [Quick Start: Your First Plugin in 5 Minutes](#quick-start-your-first-plugin-in-5-minutes)
- [Plugin Types](#plugin-types)
- [Plugin Structure](#plugin-structure)
  - [Directory Layout](#directory-layout)
  - [package.json Requirements](#packagejson-requirements)
  - [forkcart-plugin.json Manifest](#forkcart-pluginjson-manifest)
- [Plugin Definition (definePlugin)](#plugin-definition-defineplugin)
- [Settings & Configuration](#settings--configuration)
  - [Setting Types](#setting-types)
  - [Secret Settings Encryption](#secret-settings-encryption)
  - [Required Settings Validation](#required-settings-validation)
- [Lifecycle Hooks](#lifecycle-hooks)
  - [Plugin Context](#plugin-context)
  - [Activation Order](#activation-order)
- [Event Hooks & Filters](#event-hooks--filters)
  - [Event Hooks](#event-hooks)
  - [Event Payloads](#event-payloads)
  - [Filters (Data Transformation)](#filters-data-transformation)
- [Database Migrations](#database-migrations)
  - [Migration Helpers: ref() and schema](#migration-helpers-ref-and-schema)
  - [Core Schema Reference](#core-schema-reference)
  - [The product_categories Junction Table](#the-product_categories-junction-table)
  - [ScopedDatabase.execute() in Migrations](#scopeddatabaseexecute-in-migrations)
  - [How Migrations Work](#how-migrations-work)
  - [Common Migration Mistakes](#common-migration-mistakes)
- [Custom API Routes](#custom-api-routes)
- [Storefront Integration](#storefront-integration)
  - [Storefront Slots](#storefront-slots)
  - [How Slots Are Rendered](#how-slots-are-rendered)
  - [ScriptExecutor — Why This Exists](#scriptexecutor--why-this-exists)
  - [window.FORKCART Context](#windowforkcart-context)
  - [Accessing Plugin Settings from the Storefront](#accessing-plugin-settings-from-the-storefront)
  - [Storefront Slot API Endpoint](#storefront-slot-api-endpoint)
- [PageBuilder Blocks](#pagebuilder-blocks)
  - [Registering Blocks](#registering-blocks)
  - [Block Definition Reference](#block-definition-reference)
  - [The Fallback Mechanism](#the-fallback-mechanism)
  - [Block Fetch Deduplication](#block-fetch-deduplication)
  - [Admin PageBuilder Integration](#admin-pagebuilder-integration)
  - [Storefront Usage](#storefront-usage)
  - [How PluginBlock Works in Craft.js](#how-pluginblock-works-in-craftjs)
  - [Block API Endpoints](#block-api-endpoints)
- [Storefront Pages](#storefront-pages)
  - [Registering Pages](#registering-pages)
  - [PluginStorefrontPage Interface](#pluginstorefrontpage-interface)
  - [Static vs Dynamic Content](#static-vs-dynamic-content)
  - [Navigation Integration](#navigation-integration)
  - [window.FORKCART Context on Plugin Pages](#windowforkcart-context-on-plugin-pages)
  - [Storefront Page API Endpoints](#storefront-page-api-endpoints)
- [Admin Pages & Widgets](#admin-pages--widgets)
  - [Static Content](#static-content)
  - [Dynamic Content via API Route](#dynamic-content-via-api-route)
  - [Admin Page Properties](#admin-page-properties)
- [CLI Commands](#cli-commands)
- [Scheduled Tasks](#scheduled-tasks)
- [Permissions](#permissions)
  - [Permission → Table Mapping](#permission--table-mapping)
- [Plugin Dependencies](#plugin-dependencies)
- [Plugin Installation & Loading](#plugin-installation--loading)
  - [Discovery Directories](#discovery-directories)
  - [How Plugins Are Loaded](#how-plugins-are-loaded)
  - [Nested Directory Support](#nested-directory-support)
  - [Plugin Registration in Database](#plugin-registration-in-database)
  - [Installation Methods](#installation-methods)
- [Plugin Dev CLI (plugin:dev)](#plugin-dev-cli-plugindev)
- [Plugin Preview & Sandbox](#plugin-preview--sandbox)
  - [The 3 Tabs](#the-3-tabs)
  - [Viewport Switcher](#viewport-switcher)
- [Hot Reload (Dev Mode)](#hot-reload-dev-mode)
- [Plugin Store (Publishing & Installation)](#plugin-store-publishing--installation)
  - [Publishing to the Marketplace](#publishing-to-the-marketplace)
  - [Publishing as npm Package](#publishing-as-npm-package)
  - [Installation from Store](#installation-from-store)
  - [Updates](#updates)
- [Security Model](#security-model)
  - [ScopedDatabase](#scopeddatabase)
  - [Table Naming Convention (Enforced)](#table-naming-convention-enforced)
  - [Storefront HTML Sanitization](#storefront-html-sanitization)
  - [Package Name Validation](#package-name-validation)
  - [Query Stats & Rate Limiting](#query-stats--rate-limiting)
- [Health Checks & Conflict Detection](#health-checks--conflict-detection)
  - [Health Checks](#health-checks)
  - [Conflict Detection](#conflict-detection)
- [Provider Implementations](#provider-implementations)
  - [Payment Provider](#payment-provider)
  - [Marketplace Provider](#marketplace-provider)
  - [Email Provider](#email-provider)
  - [Shipping Provider](#shipping-provider)
- [Best Practices](#best-practices)
- [Troubleshooting & Common Gotchas](#troubleshooting--common-gotchas)
- [Full API Reference](#full-api-reference)
  - [Plugin Management Endpoints](#plugin-management-endpoints)
  - [Plugin Store Endpoints](#plugin-store-endpoints)
  - [Public Plugin Endpoints](#public-plugin-endpoints)
  - [Scheduled Task Endpoints](#scheduled-task-endpoints)
  - [Available Events](#available-events)
  - [Available Filters](#available-filters)
  - [Available Storefront Slots](#available-storefront-slots)
- [Full Examples](#full-examples)
  - [Discount Codes Plugin](#discount-codes-plugin)
  - [Nyx Recommendations Plugin](#nyx-recommendations-plugin)
- [Need Help?](#need-help)

---

## Introduction

ForkCart plugins are self-contained ES modules that extend every part of the platform — from storefront UI to payment processing, from admin dashboards to scheduled background tasks. The plugin system is inspired by WordPress, Shopware, and WooCommerce, but built for modern TypeScript with full type safety.

**Key concepts:**

- **`definePlugin()`** — A single function that declares everything your plugin does
- **ScopedDatabase** — Permission-aware database access (plugins never touch the raw DB)
- **Storefront Slots** — Inject HTML/JS into predefined storefront positions
- **PageBuilder Blocks** — Drag-and-drop blocks with automatic fallback rendering
- **Plugin Store** — One-click install, auto-compilation, and hot reload

---

## Quick Start: Your First Plugin in 5 Minutes

```bash
mkdir forkcart-plugin-my-widget && cd forkcart-plugin-my-widget
npm init -y
npm install --save-dev @forkcart/plugin-sdk typescript
```

Create `src/index.ts`:

```ts
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'my-widget',
  version: '1.0.0',
  type: 'general',
  description: 'My first ForkCart plugin',
  author: 'You',

  settings: {
    apiKey: {
      type: 'string',
      label: 'API Key',
      required: true,
      secret: true,
    },
    enabled: { type: 'boolean', label: 'Enabled', default: true },
  },

  hooks: {
    'order:created': async (event, ctx) => {
      ctx.logger.info('New order!', { orderId: event.payload.orderId });
    },
  },

  onActivate: async (ctx) => {
    ctx.logger.info('Hello from my-widget!');
  },
});
```

Build, copy to `data/plugins/my-widget/`, and activate from the admin panel. That's it — you have a working plugin.

---

## Plugin Types

Every plugin declares a `type` that determines which provider interfaces it can implement:

| Type          | Purpose                                    | Provider Interface    |
| ------------- | ------------------------------------------ | --------------------- |
| `payment`     | Payment gateways (Stripe, PayPal, Klarna)  | `PaymentProvider`     |
| `marketplace` | External marketplaces (Amazon, eBay, Otto) | `MarketplaceProvider` |
| `email`       | Email providers (Mailgun, SendGrid, SMTP)  | `EmailProvider`       |
| `shipping`    | Shipping & carriers (DHL, FedEx, UPS)      | `ShippingProvider`    |
| `analytics`   | Tracking & analytics (GA4, Plausible)      | —                     |
| `general`     | Everything else                            | —                     |

---

## Plugin Structure

### Directory Layout

Plugins live in `data/plugins/<slug>/`. This is the primary path the loader scans.

```
data/plugins/my-widget/
├── forkcart-plugin.json    # Optional manifest (slug, display name, category)
├── package.json            # Must have "forkcart-plugin" keyword or matching name prefix
├── README.md               # Documentation (required for marketplace)
├── src/
│   └── index.ts            # Source (auto-compiled on install from Plugin Store)
├── dist/
│   └── index.js            # Entry point (package.json "main" field)
└── tsconfig.json
```

### package.json Requirements

Your plugin's `package.json` must meet these requirements for the loader to discover and import it:

```json
{
  "name": "forkcart-plugin-my-widget",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "keywords": ["forkcart-plugin"],
  "peerDependencies": {
    "@forkcart/plugin-sdk": "^0.1.0"
  }
}
```

**Critical fields:**

| Field      | Required | Why                                                      |
| ---------- | -------- | -------------------------------------------------------- |
| `type`     | ✅       | Must be `"module"` — plugins are loaded as ES modules    |
| `main`     | ✅       | Entry point for the loader (defaults to `dist/index.js`) |
| `exports`  | ✅       | Proper ESM exports map for Node.js resolution            |
| `keywords` | ✅       | Must include `"forkcart-plugin"` for auto-discovery      |

The loader identifies ForkCart plugins by:

1. `keywords` array containing `"forkcart-plugin"`, **OR**
2. Package name starting with `forkcart-plugin-` or `@forkcart/plugin-`

### forkcart-plugin.json Manifest

An optional (but recommended for marketplace) manifest file:

```json
{
  "name": "My Widget",
  "slug": "my-widget",
  "packageName": "forkcart-plugin-my-widget",
  "version": "1.0.0",
  "type": "general",
  "description": "Does awesome things",
  "author": "Your Name",
  "license": "MIT",
  "category": "Marketing",
  "minForkcartVersion": "0.5.0",
  "entryPoint": "dist/index.js"
}
```

| Field                | Required | Description                                      |
| -------------------- | -------- | ------------------------------------------------ |
| `name`               | ✅       | Human-readable plugin name                       |
| `slug`               | ✅       | URL-safe identifier (lowercase, hyphens)         |
| `packageName`        | ✅       | npm package name                                 |
| `version`            | ✅       | Semver version                                   |
| `type`               | ✅       | Plugin type (see above)                          |
| `description`        |          | Short description for marketplace                |
| `author`             |          | Author name                                      |
| `license`            |          | License (MIT, GPL-3.0, etc.)                     |
| `category`           |          | Category in the Plugin Store                     |
| `minForkcartVersion` |          | Minimum ForkCart version required                |
| `entryPoint`         |          | Path to compiled JS entry point (default: dist/) |

The `slug` is used for DB lookups and URL routing. If absent, the loader derives it from the plugin name.

---

## Plugin Definition (definePlugin)

The SDK's `definePlugin()` is a typed identity function — it validates the shape at compile time and returns the definition as-is at runtime.

```ts
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  // ─── Required ──────────────────────────────────────
  name: 'my-widget', // Technical name (kebab-case)
  version: '1.0.0', // Semver
  type: 'general', // 'payment' | 'marketplace' | 'email' | 'shipping' | 'analytics' | 'general'
  description: 'What it does',
  author: 'Who made it',

  // ─── Optional metadata ─────────────────────────────
  homepage: 'https://example.com',
  repository: 'https://github.com/you/my-widget',
  license: 'MIT',
  keywords: ['widget', 'storefront'],
  minVersion: '0.1.0', // Minimum ForkCart version required

  // ─── Features (all optional) ───────────────────────
  settings: {}, // Admin-configurable settings
  hooks: {}, // Event listeners
  filters: {}, // Data transformation (like WordPress apply_filters)
  routes: (router) => {}, // Custom API endpoints
  adminPages: [], // Admin panel pages
  storefrontSlots: [], // Inject HTML into storefront
  pageBuilderBlocks: [], // Craft.js PageBuilder blocks
  migrations: [], // Database schema changes
  cli: [], // CLI commands
  scheduledTasks: [], // Cron jobs
  provider: {}, // Payment/shipping/email/marketplace provider methods
  dependencies: [], // Other plugins that must be active
  permissions: [], // Required capabilities

  // ─── Lifecycle hooks ───────────────────────────────
  onInstall: async (ctx) => {},
  onActivate: async (ctx) => {},
  onDeactivate: async (ctx) => {},
  onUninstall: async (ctx) => {},
  onUpdate: async (ctx, fromVersion) => {},
  onReady: async (ctx) => {},
  onError: async (error, source, ctx) => {},
});
```

---

## Settings & Configuration

Settings are declared as a typed schema. The admin panel auto-generates a form from this schema — no UI code required.

### Setting Types

```ts
settings: {
  // Text input
  apiKey: {
    type: 'string',
    label: 'API Key',
    required: true,
    secret: true,           // Encrypted at rest, shown as •••••••• in admin
    placeholder: 'sk_...',
    description: 'Your payment gateway API key',
  },

  // Number input
  maxItems: {
    type: 'number',
    label: 'Max Items',
    default: 10,
    min: 1,
    max: 100,
  },

  // Checkbox
  enabled: {
    type: 'boolean',
    label: 'Enable Widget',
    default: true,
  },

  // Dropdown
  theme: {
    type: 'select',
    label: 'Theme',
    options: ['light', 'dark', 'auto'],
    default: 'auto',
  },
},
```

**Available types:** `string`, `number`, `boolean`, `select`.

Settings are available in every lifecycle hook and route handler via `ctx.settings`. You never deal with encryption or storage yourself — the framework handles everything.

### Secret Settings Encryption

Settings marked with `secret: true` are automatically encrypted at rest using AES-256-GCM:

- **Encrypted** before being stored in the database
- **Decrypted** when passed to plugin handlers via `ctx.settings`
- **Displayed** as `••••••••` in Admin API responses

When the admin saves settings, the loader only encrypts values that aren't already encrypted — so round-tripping the masked value won't corrupt the actual secret.

### Required Settings Validation

If a setting has `required: true`, the plugin **cannot be activated** until that setting is filled in. The loader checks this before calling `onActivate`, and the admin panel shows an error if required settings are missing.

---

## Lifecycle Hooks

All lifecycle hooks receive a [Plugin Context](#plugin-context) object.

```ts
onInstall: async (ctx) => {
  // First-time setup
  ctx.logger.info('Plugin installed!');
},

onActivate: async (ctx) => {
  // Start background tasks, register resources
  // Called AFTER hooks, filters, slots, and migrations are registered
},

onDeactivate: async (ctx) => {
  // Stop background tasks, clean up
},

onUninstall: async (ctx) => {
  // Remove data, clean up completely
},

onUpdate: async (ctx, fromVersion) => {
  // Handle version-specific migrations
  if (fromVersion < '2.0.0') {
    // Migrate old data format
  }
},

onReady: async (ctx) => {
  // Runs on EVERY server startup for active plugins
  // Use for: cache warming, connection pools, health checks
  ctx.logger.info('Plugin ready — warming caches...');
},

onError: async (error, source, ctx) => {
  // source = { type: 'hook' | 'route' | 'task' | 'filter', name: string }
  ctx.logger.error(`Error in ${source.type}:${source.name}: ${error.message}`);
  // Return true to suppress the error (prevent propagation)
  // Return void/false to let it propagate normally
},
```

| Hook           | When it's called                                   |
| -------------- | -------------------------------------------------- |
| `onInstall`    | Plugin is installed for the first time             |
| `onActivate`   | Plugin is activated (toggled on)                   |
| `onDeactivate` | Plugin is deactivated (toggled off)                |
| `onUninstall`  | Plugin is being removed                            |
| `onUpdate`     | A new version is detected (receives `fromVersion`) |
| `onReady`      | Every API server startup, after activation         |
| `onError`      | Unhandled error in a hook, route, or task          |

> **`onReady` vs `onActivate`:** `onActivate` runs when the plugin is toggled on. `onReady` runs on **every server startup** for already-active plugins. Use `onReady` for anything that needs to happen after a server restart (cache warmup, health checks, connection pools).

### Plugin Context

Every handler receives a context object:

```ts
interface PluginContext {
  /** Resolved settings values (secrets are decrypted) */
  settings: ResolvedSettings;
  /** Scoped database — permission-aware proxy (see Security Model) */
  db: ScopedDatabase;
  /** Scoped logger (prefixed with plugin name) */
  logger: PluginLogger;
  /** Event bus for subscribing / emitting */
  eventBus: PluginEventBus;
}
```

The `db` field is a `ScopedDatabase` instance, **not** the raw Drizzle database handle. See [Security Model](#security-model) for details.

### Activation Order

When a plugin is activated, the following happens in order:

1. Dependencies are validated (all required plugins must be installed and active)
2. Required settings are validated (missing required settings block activation)
3. Event hooks are registered on the EventBus
4. Filters are registered
5. Storefront slots are registered
6. CLI commands are registered
7. Scheduled tasks are registered
8. Custom routes are registered
9. Pending migrations are run (passing `db` + `{ ref, schema }` helpers)
10. `onActivate` is called
11. `onReady` is called (also on every server restart)
12. Provider bridges are registered (payment, email, marketplace, shipping)

---

## Event Hooks & Filters

### Event Hooks

React to domain events. The full event list is in `@forkcart/plugin-sdk` → `events.ts`.

```ts
hooks: {
  'order:paid': async (event, ctx) => {
    const { orderId, total } = event.payload;
    ctx.logger.info('Order paid!', { orderId, total });
  },
  'product:created': async (event, ctx) => {
    // Sync new product to external marketplace
  },
},
```

You can import typed event constants from the SDK:

```ts
import { PLUGIN_EVENTS } from '@forkcart/plugin-sdk';

// Use PLUGIN_EVENTS.ORDER_CREATED instead of 'order:created'
```

See [Available Events](#available-events) for the full list.

### Event Payloads

```ts
// order:created
interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    productId: string;
    variantId?: string;
    sku?: string;
    quantity: number;
    price: number;
  }>;
}

// order:paid
interface OrderPaidPayload {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  provider: string;
}

// inventory:low
interface InventoryLowPayload {
  productId: string;
  variantId?: string;
  sku?: string;
  currentQuantity: number;
  threshold: number;
}
```

### Filters (Data Transformation)

Transform data as it flows through the system (inspired by WordPress `apply_filters`):

```ts
filters: {
  'product:price': async (price, ctx) => {
    return Math.round(price * 0.9); // 10% off everything
  },
  'cart:total': async (total, ctx) => {
    return total + 500; // +5.00 in cents
  },
  'search:results': async (results, ctx) => {
    return results.filter(p => p.isAvailable);
  },
},
```

Filters are applied in priority order (default priority: 10). If a filter handler throws, the data is returned unmodified.

See [Available Filters](#available-filters) for the full list.

---

## Database Migrations

Plugins can create custom tables. Table names **must** be prefixed with `plugin_<name>_` (the ScopedDatabase enforces this).

```ts
migrations: [
  {
    version: "1.0.0",
    description: "Create widget_logs table",
    up: async (db, helpers) => {
      const r = helpers?.ref || (() => "UUID");

      await db.execute(`
        CREATE TABLE IF NOT EXISTS plugin_my_widget_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id ${r("products.id")} NOT NULL,
          customer_id ${r("customers.id")},
          action VARCHAR(50) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_widget_logs_product
          ON plugin_my_widget_logs(product_id);
      `);
    },
    down: async (db) => {
      await db.execute("DROP TABLE IF EXISTS plugin_my_widget_logs;");
    },
  },
],
```

**Always provide a `down()` function** for rollback support, even if it's just `DROP TABLE`.

### Migration Helpers: ref() and schema

The second argument to `up()` provides two helpers:

- **`ref(path)`** — Returns the SQL type for a core table column. This prevents you from guessing column types and keeps your migrations aligned with core schema changes.

  ```ts
  ref('products.id'); // → 'UUID'
  ref('products.name'); // → 'VARCHAR(255)'
  ref('products.price'); // → 'INTEGER'
  ref('customers.email'); // → 'VARCHAR(255)'
  ```

- **`schema`** — The full `coreSchema` object for programmatic introspection:

  ```ts
  up: async (db, { ref, schema }) => {
    const productIdType = ref('products.id'); // 'UUID'
    const orderCols = Object.keys(schema.orders); // ['id', 'order_number', 'status', ...]
  };
  ```

The `ref()` function provides full IDE autocomplete for all valid `table.column` paths.

You can also import these directly:

```ts
import { ref, coreSchema } from '@forkcart/plugin-sdk';

// Use in template literals for migrations:
`source_product_id ${ref('products.id')} NOT NULL`;
// expands to: "source_product_id UUID NOT NULL"
```

### Core Schema Reference

| Table                | Primary Key | Common Columns                                         |
| -------------------- | ----------- | ------------------------------------------------------ |
| `products`           | `UUID`      | name, slug, sku, price, currency, category_id, status  |
| `variants`           | `UUID`      | product_id, sku, name, price, stock_quantity           |
| `orders`             | `UUID`      | order_number, status, customer_id, email, total_amount |
| `order_items`        | `UUID`      | order_id, product_id, variant_id, quantity, unit_price |
| `customers`          | `UUID`      | email, first_name, last_name, phone                    |
| `categories`         | `UUID`      | name, slug, parent_id, sort_order                      |
| `product_categories` | Composite   | product_id, category_id (many-to-many junction)        |
| `media`              | `UUID`      | filename, mime_type, url                               |
| `payments`           | `UUID`      | order_id, provider, status, amount                     |
| `product_images`     | `UUID`      | product_id, url, alt_text, sort_order                  |
| `product_reviews`    | `UUID`      | product_id, customer_id, rating, title                 |

To inspect the full schema at runtime:

```ts
import { coreSchema } from '@forkcart/plugin-sdk';

console.log(coreSchema.products);
// { id: { sqlType: 'UUID', nullable: false, primaryKey: true }, name: { sqlType: 'VARCHAR(255)', ... }, ... }
```

### The product_categories Junction Table

The `product_categories` table is a **many-to-many junction table** linking products to categories. While `products.category_id` holds the _primary_ category, `product_categories` is the canonical table for **all** category assignments (including the primary one). It has a composite primary key:

| Column        | Type   | Notes               |
| ------------- | ------ | ------------------- |
| `product_id`  | `UUID` | PK, FK → products   |
| `category_id` | `UUID` | PK, FK → categories |

Use it in migrations when you need to reference multi-category assignments:

```ts
up: async (db, { ref }) => {
  await db.execute(`
    CREATE TABLE plugin_my_widget_category_stats (
      category_id ${ref('product_categories.category_id')} NOT NULL,
      product_count INTEGER DEFAULT 0,
      PRIMARY KEY (category_id)
    );
  `);
};
```

### ScopedDatabase.execute() in Migrations

The `execute()` method supports both Drizzle SQL template tags and raw SQL strings:

```ts
// Drizzle sql tag (from drizzle-orm)
await db.execute(sql`CREATE TABLE IF NOT EXISTS ...`);

// Raw SQL string (no params)
await db.execute('CREATE TABLE IF NOT EXISTS plugin_my_plugin_data (id SERIAL PRIMARY KEY)');

// Raw SQL string with positional params ($1, $2, ...)
await db.execute('INSERT INTO plugin_my_plugin_data (name) VALUES ($1)', ['test']);
```

### How Migrations Work

1. Applied migrations are tracked in the `plugin_migrations` table
2. On plugin activation, `MigrationRunner.runPendingMigrations()` compares defined vs. applied migrations
3. Pending migrations run in version order (semver string comparison)
4. The `up` function receives two arguments: `db` (ScopedDatabase) and `helpers` (`{ ref, schema }`)
5. On plugin version update, new migrations are automatically run
6. A migration validator warns if you use VARCHAR for columns that reference UUID core tables

### Common Migration Mistakes

| ❌ Wrong                                | ✅ Right                                      | Why                                                     |
| --------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| `product_id VARCHAR(255)`               | `product_id ${ref('products.id')}`            | products.id is UUID, not VARCHAR                        |
| `JOIN products ON products.id = my_col` | `JOIN products ON products.id::text = my_col` | Type mismatch without cast (if you used VARCHAR)        |
| Hardcoding `UUID`                       | Using `ref('products.id')`                    | Future-proof — if we change the type, ref() updates too |
| No `down()` function                    | Always include `down()`                       | Required for rollback support                           |

---

## Custom API Routes

Plugins can register custom HTTP endpoints. Routes are mounted at `/api/v1/public/plugins/<plugin-slug>/`.

```ts
routes: (router) => {
  // GET /api/v1/public/plugins/my-widget/hello
  router.get('/hello', async (c) => {
    const db = c.get('db'); // ScopedDatabase
    const settings = c.get('pluginSettings'); // Your settings
    const logger = c.get('logger'); // Scoped logger
    return c.json({ message: 'Hello from my-widget!' });
  });

  // POST /api/v1/public/plugins/my-widget/webhook
  router.post('/webhook', async (c) => {
    const body = await c.req.json();
    // Handle incoming webhook...
    return c.json({ ok: true });
  });
};
```

The `router` is a Hono-compatible interface with `get`, `post`, `put`, `delete`, and `patch` methods. Plugin context (db, settings, logger) is automatically injected into every request via `c.get()`.

**Important:** The plugin slug in the URL is derived from `name` — kebab-cased, lowercased, non-alphanumeric chars replaced with hyphens. So `"FOMO Badges"` becomes `/plugins/fomo-badges/`.

---

## Storefront Integration

### Storefront Slots

Inject HTML into predefined storefront positions:

```ts
storefrontSlots: [
  {
    slot: "product-page-bottom",
    content: '<div class="my-widget">Hello from the product page!</div>',
    order: 10, // Lower = earlier
    pages: ["/product/*"], // Optional page filter (supports * wildcards)
  },
],
```

See [Available Storefront Slots](#available-storefront-slots) for the full list of slot positions.

### How Slots Are Rendered

`StorefrontSlot` is a **Next.js Server Component** that:

1. Fetches slot content from `/api/v1/public/plugins/slots/<slotName>`
2. Sanitizes HTML through a liberal allowlist (scripts, styles, iframes, forms, SVG are all allowed — see [Security Model](#storefront-html-sanitization))
3. Separates `<script>` tags from the HTML
4. Renders HTML via `dangerouslySetInnerHTML`
5. Executes scripts via `ScriptExecutor` (see below)

Slot content is cached with `revalidate: 60` (1 minute) by Next.js.

### ScriptExecutor — Why This Exists

**This is critical to understand.** Regular `<script>` tags inside `dangerouslySetInnerHTML` do **not** execute in React. Worse: when content is inside a React Suspense boundary (which Next.js uses heavily), even injected scripts in the hidden DOM won't run.

`ScriptExecutor` is a client component that solves this:

```tsx
'use client';
import { useEffect, useRef } from 'react';

export function ScriptExecutor({ content }: { content: string }) {
  const executed = useRef(false);
  useEffect(() => {
    if (executed.current || !content) return;
    executed.current = true;
    try {
      new Function(content)();
    } catch (err) {
      console.error('[ScriptExecutor] Plugin script error:', err);
    }
  }, [content]);
  return null;
}
```

It runs your inline scripts via `new Function()` after mount. This means:

- ✅ Scripts run reliably regardless of Suspense boundaries
- ✅ Scripts run exactly once (guarded by ref)
- ⚠️ Scripts don't have access to the `<script>` element itself
- ⚠️ External script `src` attributes won't be loaded — use inline code that creates script elements dynamically if you need external scripts

`PluginBlockFallback` uses the same script handling for PageBuilder blocks.

### window.FORKCART Context

Every storefront page sets `window.FORKCART` with page-specific data that your plugin scripts can read. This is the primary way to get context about the current page without parsing URLs yourself.

The root layout always provides:

```ts
window.FORKCART.apiUrl; // Base API URL (e.g. "http://localhost:3000")
```

**Properties per page type:**

| Page     | `pageType`   | Additional properties                            |
| -------- | ------------ | ------------------------------------------------ |
| Product  | `"product"`  | `productId` (UUID), `productSlug`                |
| Category | `"category"` | `categorySlug`, `categoryId` (UUID, if resolved) |
| Cart     | `"cart"`     | —                                                |
| Checkout | `"checkout"` | —                                                |
| Search   | `"search"`   | `query` (the search string, if present)          |
| Account  | `"account"`  | —                                                |

**Usage in plugin scripts:**

```ts
// Inside your storefrontSlot or pageBuilderBlock <script>:
const fc = window.FORKCART || {};

if (fc.pageType === 'product') {
  fetch(`${fc.apiUrl}/api/v1/public/plugins/my-widget/recs?product=${fc.productId}`)
    .then((r) => r.json())
    .then((data) => {
      // Render recommendations
    });
}
```

> **Note:** On SSR pages (product, category, search), `window.FORKCART` is set via an inline `<script>` tag that runs before your plugin scripts. On client-rendered pages (cart, checkout, account), it's set via `useEffect` — so it's available by the time the DOM settles, but not during the very first synchronous tick.

### Accessing Plugin Settings from the Storefront

Don't hardcode settings in inline JS. Use the injected config pattern:

```ts
storefrontSlots: [
  {
    slot: "product-page-bottom",
    content: `
    <script>
      const settings = window.FORKCART?.pluginSettings?.['my-plugin'] || {};
      const minViewers = settings.minViewers || 2;
      const productId = window.FORKCART?.productId;
      if (productId) {
        fetch(window.FORKCART.apiUrl + '/api/v1/public/plugins/my-plugin/stats?product=' + productId)
          .then(r => r.json())
          .then(data => { /* render widget */ });
      }
    </script>
  `,
  },
],
```

### Storefront Slot API Endpoint

Plugin slot content is served from:

```
GET /api/v1/public/plugins/slots/:slotName?page=<currentPage>
```

This is a **public** endpoint (no auth required) so the storefront can fetch it server-side. The `page` query parameter filters slots that have `pages` restrictions.

---

## PageBuilder Blocks

Plugins can register custom blocks for the Craft.js-based PageBuilder. The killer feature: blocks have a **fallback mechanism** — if the admin hasn't placed your block in the page template, it automatically renders at a default slot position.

### Registering Blocks

```ts
pageBuilderBlocks: [
  {
    name: "fomo-widget",
    label: "FOMO Widget",
    icon: "🔥",
    category: "Social Proof",
    description: "Shows recent purchases and visitor count",
    content: `
      <div class="fomo-widget" id="fomo-widget-root">
        <p>Loading social proof...</p>
      </div>
      <script>
        document.getElementById('fomo-widget-root').innerHTML =
          '<p>🔥 12 people bought this in the last hour</p>';
      </script>
    `,
    defaultSlot: "product-page-bottom",
    defaultOrder: 5,
    pages: ["/product/*"],
  },
],
```

### Block Definition Reference

| Field          | Type       | Required | Description                                                                |
| -------------- | ---------- | -------- | -------------------------------------------------------------------------- |
| `name`         | `string`   | ✅       | Unique block ID within the plugin                                          |
| `label`        | `string`   | ✅       | Display name in the PageBuilder                                            |
| `icon`         | `string`   | —        | Emoji or icon name                                                         |
| `category`     | `string`   | —        | Category in the block picker (default: `'Plugins'`)                        |
| `description`  | `string`   | —        | Tooltip / hover description                                                |
| `content`      | `string`   | ✅       | HTML content (scripts and styles allowed — same trust model as slots)      |
| `defaultSlot`  | `string`   | —        | Fallback slot if not placed in the template (e.g. `'product-page-bottom'`) |
| `defaultOrder` | `number`   | —        | Order within the fallback slot (lower = earlier, default: `10`)            |
| `pages`        | `string[]` | —        | Page filter (supports `*` wildcards, e.g. `['/product/*']`)                |
| `settings`     | `object`   | —        | Block-specific settings schema                                             |

### The Fallback Mechanism

This is the key innovation. Here's how it works:

1. **Plugin registers a block** with `defaultSlot: 'product-page-bottom'`
2. **Admin opens the PageBuilder** — the block appears in the block picker under its category
3. **Two scenarios:**
   - **Admin places the block** → It renders where they put it. No fallback.
   - **Admin doesn't place it** → It automatically renders at `product-page-bottom` via the fallback system.

This means **plugins work immediately after installation** with no admin setup, but admins get full control over placement whenever they want.

### Block Fetch Deduplication

When multiple `PluginBlock` components render concurrently (common with several blocks on one page), the storefront **deduplicates the API call**. Only **one** request to `/api/v1/public/plugins/blocks` is made — all concurrent renders share the same in-flight promise. Results are cached in memory for 5 minutes and also leverage the Next.js fetch cache (`revalidate: 300`).

You don't need to do anything special — this is automatic.

### Admin PageBuilder Integration

Plugin blocks automatically appear in the admin PageBuilder's block picker under a **🧩 Plugins** section. No admin configuration is required — as soon as a plugin with `pageBuilderBlocks` is active, its blocks show up.

**How it works:**

1. The Component Panel fetches registered blocks from `GET /api/v1/public/plugins/blocks`
2. Each plugin block appears in the "🧩 Plugins" category with a purple-accented border
3. Admins can **drag and drop** plugin blocks into the page canvas just like built-in blocks
4. In the editor, plugin blocks display a preview placeholder showing the block name, plugin name, and icon
5. The Settings Panel shows read-only plugin block info (plugin name, block name, description)
6. On the storefront, the `PluginBlockRenderer` fetches and renders the block's actual HTML content

Plugin blocks are visually distinct from built-in blocks (purple styling vs green) so admins can easily identify which blocks come from plugins.

### Storefront Usage

In your page layouts, use `PluginBlockFallback` alongside existing `StorefrontSlot`:

```tsx
import { StorefrontSlot } from '@/components/plugins/StorefrontSlot';
import { PluginBlockFallback } from '@/components/plugins/PluginBlockFallback';
import { extractPlacedPluginBlocks } from '@/components/plugins/extract-placed-blocks';

export default async function ProductPage({ pageContent }) {
  const placedBlocks = extractPlacedPluginBlocks(pageContent);

  return (
    <div>
      {/* ... product content ... */}

      {/* Existing slot-based plugin content */}
      <StorefrontSlot slotName="product-page-bottom" />

      {/* Plugin blocks not placed in PageBuilder → render at default slot */}
      <PluginBlockFallback
        slotName="product-page-bottom"
        currentPage="/product/my-product"
        placedBlocks={placedBlocks}
      />
    </div>
  );
}
```

### How PluginBlock Works in Craft.js

When an admin drags a plugin block into the page template, the Craft.js JSON stores:

```json
{
  "node-abc": {
    "type": { "resolvedName": "PluginBlock" },
    "props": {
      "pluginName": "fomo-badges",
      "blockName": "fomo-widget"
    }
  }
}
```

The `PageRenderer` detects `PluginBlock` nodes and renders them via `PluginBlockRenderer`, which fetches the block's HTML content from the API.

### Block API Endpoints

```
GET /api/v1/public/plugins/blocks
```

Returns all registered PageBuilder blocks (used by the admin block picker).

```
GET /api/v1/public/plugins/blocks/fallbacks?page=/product/xyz&placed=fomo-badges:fomo-widget
```

Returns blocks that need fallback rendering. Parameters:

- `page` — Current page path (for page filtering)
- `placed` — Comma-separated `pluginName:blockName` keys already in the template

---

## Storefront Pages

Plugins can register their own full pages in the storefront. Unlike [Storefront Slots](#storefront-slots) (which inject content into existing pages), storefront pages are standalone routes — think `/wishlist`, `/loyalty/rewards`, or `/order-tracking`.

All plugin pages are served under the `/ext/` prefix with locale:

```
https://your-store.com/en/ext/wishlist
https://your-store.com/de/ext/loyalty/rewards
```

The catch-all route at `app/[locale]/ext/[...slug]/page.tsx` fetches the page content from the API and renders it with proper metadata, styles, scripts, and auth handling.

### Registering Pages

Add a `storefrontPages` array to your plugin definition:

```typescript
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'wishlist',
  version: '1.0.0',
  type: 'general',
  description: 'Customer wishlists',
  author: 'Your Name',

  storefrontPages: [
    {
      path: '/wishlist',
      title: 'My Wishlist',
      content: `
        <div id="wishlist-root">
          <h1>My Wishlist</h1>
          <div id="wishlist-items">Loading...</div>
        </div>
      `,
      scripts: [
        `
        fetch('/api/v1/public/plugins/wishlist/items')
          .then(r => r.json())
          .then(data => {
            document.getElementById('wishlist-items').innerHTML =
              data.data.map(item => '<div>' + item.name + '</div>').join('');
          });
        `,
      ],
      styles: '#wishlist-root { max-width: 800px; margin: 0 auto; padding: 2rem; }',
      showInNav: true,
      navLabel: 'Wishlist',
      navIcon: '❤️',
      requireAuth: true,
      metaDescription: 'View and manage your wishlist',
    },
  ],
});
```

### PluginStorefrontPage Interface

| Property          | Type       | Required | Description                                                                |
| ----------------- | ---------- | -------- | -------------------------------------------------------------------------- |
| `path`            | `string`   | ✅       | URL path without locale prefix, e.g. `'/wishlist'` or `'/loyalty/rewards'` |
| `title`           | `string`   | ✅       | Page title for `<title>` tag and breadcrumbs                               |
| `content`         | `string`   | –        | Static HTML content to render                                              |
| `contentRoute`    | `string`   | –        | API route (relative to plugin routes) returning `{ html: string }`         |
| `scripts`         | `string[]` | –        | JavaScript to execute — inline code or URLs                                |
| `styles`          | `string`   | –        | CSS to inject into the page                                                |
| `showInNav`       | `boolean`  | –        | Show a link in the storefront header navigation                            |
| `navLabel`        | `string`   | –        | Navigation label (defaults to `title`)                                     |
| `navIcon`         | `string`   | –        | Navigation icon (emoji or icon class)                                      |
| `requireAuth`     | `boolean`  | –        | Redirect unauthenticated visitors to login                                 |
| `metaDescription` | `string`   | –        | SEO meta description                                                       |

Provide either `content` (static HTML) or `contentRoute` (dynamic). If both are set, `content` takes precedence.

### Static vs Dynamic Content

**Static pages** use `content` — the HTML is returned directly:

```typescript
storefrontPages: [
  {
    path: '/about-rewards',
    title: 'About Our Rewards Program',
    content: '<div class="rewards-info"><h1>Earn Points</h1><p>...</p></div>',
  },
];
```

**Dynamic pages** use `contentRoute` — the storefront fetches HTML from your plugin's API route at render time:

```typescript
storefrontPages: [
  {
    path: '/loyalty/rewards',
    title: 'My Rewards',
    contentRoute: '/rewards/page',
    requireAuth: true,
  },
],

routes(router) {
  router.get('/rewards/page', async (c) => {
    // Build HTML dynamically (e.g. fetch customer data)
    return c.json({ html: '<div>Your points: 420</div>' });
  });
},
```

When `contentRoute` is set, the API internally calls `GET /api/v1/public/plugins/<plugin-slug><contentRoute>` and returns the HTML in the response.

### Navigation Integration

Pages with `showInNav: true` automatically appear in the storefront header. The storefront fetches the page list from `GET /api/v1/public/plugins/pages` and renders nav links for pages that have `showInNav` enabled.

```typescript
storefrontPages: [
  {
    path: '/store-locator',
    title: 'Store Locator',
    content: '<div id="map">...</div>',
    showInNav: true,
    navLabel: 'Stores', // Shorter label for the nav bar
    navIcon: '📍',
  },
];
```

### window.FORKCART Context on Plugin Pages

On plugin pages, the `PluginPageContext` client component sets additional properties on `window.FORKCART`:

```typescript
window.FORKCART.pageType = 'plugin-page';
window.FORKCART.pluginPage = '/wishlist'; // the page path
```

Use this in your scripts to detect that you're running on a plugin page:

```javascript
if (window.FORKCART?.pageType === 'plugin-page') {
  console.log('Running on plugin page:', window.FORKCART.pluginPage);
}
```

The standard `window.FORKCART` properties (`locale`, `apiBase`, `currency`, `storeName`) are also available — see [window.FORKCART Context](#windowforkcart-context).

### Storefront Page API Endpoints

| Method | Endpoint                              | Description                                               |
| ------ | ------------------------------------- | --------------------------------------------------------- |
| GET    | `/api/v1/public/plugins/pages`        | List all registered storefront pages (metadata only)      |
| GET    | `/api/v1/public/plugins/pages/<path>` | Get page content — returns `html`, `source`, and metadata |

**List pages response:**

```json
{
  "data": [
    {
      "pluginName": "wishlist",
      "path": "/wishlist",
      "title": "My Wishlist",
      "showInNav": true,
      "navLabel": "Wishlist",
      "navIcon": "❤️",
      "requireAuth": true,
      "metaDescription": "View and manage your wishlist"
    }
  ]
}
```

**Get page content response:**

```json
{
  "data": {
    "pluginName": "wishlist",
    "path": "/wishlist",
    "title": "My Wishlist",
    "html": "<div id=\"wishlist-root\">...</div>",
    "scripts": ["fetch('/api/v1/public/plugins/wishlist/items')..."],
    "styles": "#wishlist-root { max-width: 800px; ... }",
    "source": "static"
  }
}
```

The `source` field indicates how content was resolved: `"static"` (from `content`), `"api"` (from `contentRoute`), or `"empty"` (no content configured).

---

## Admin Pages & Widgets

Plugins can add pages to the admin panel. Two content strategies are available. Admin pages automatically appear in the admin sidebar under a **Plugins** section when the plugin is active.

### Static Content

Provide an HTML string directly. Scripts are extracted and executed after render (same trust model as storefront slots):

```ts
adminPages: [
  {
    path: "/dashboard",
    label: "My Dashboard",
    icon: "chart-bar",
    order: 10,
    content: `
      <div id="my-dashboard">
        <h2>Plugin Dashboard</h2>
        <div id="stats">Loading...</div>
        <script>
          fetch('/api/v1/public/plugins/my-plugin/stats')
            .then(r => r.json())
            .then(data => {
              document.getElementById('stats').innerHTML =
                '<p>Total items: ' + data.total + '</p>';
            });
        </script>
      </div>
    `,
  },
],
```

### Dynamic Content via API Route

Point to a route within your plugin's custom routes that returns `{ html: string }`:

```ts
adminPages: [
  {
    path: '/reports',
    label: 'Reports',
    icon: 'file-text',
    order: 20,
    // This calls GET /api/v1/public/plugins/<your-plugin>/admin/reports
    apiRoute: '/admin/reports',
  },
],

// In your plugin routes:
routes: (router) => {
  router.get('/admin/reports', (c) => {
    return c.json({
      html: '<div><h2>Reports</h2><p>Generated at ' + new Date().toISOString() + '</p></div>'
    });
  });
},
```

### Admin Page Properties

| Property   | Type     | Required | Description                                                           |
| ---------- | -------- | -------- | --------------------------------------------------------------------- |
| `path`     | `string` | ✅       | URL path (e.g., `/dashboard`)                                         |
| `label`    | `string` | ✅       | Display name in sidebar and page header                               |
| `icon`     | `string` | —        | Icon name (for future use)                                            |
| `order`    | `number` | —        | Sort order in navigation (default: 10)                                |
| `parent`   | `string` | —        | Parent page path for nesting                                          |
| `content`  | `string` | —        | Static HTML content to render                                         |
| `apiRoute` | `string` | —        | Plugin route path that returns `{ html: string }` for dynamic content |

---

## CLI Commands

Register commands accessible via the ForkCart CLI:

```ts
cli: [
  {
    name: "sync",
    description: "Sync products to marketplace",
    args: [{ name: "sku", description: "Product SKU", required: false }],
    options: [
      {
        name: "force",
        alias: "f",
        description: "Force sync",
        type: "boolean",
        default: false,
      },
      {
        name: "format",
        alias: "F",
        description: "Output format",
        type: "string",
        default: "table",
      },
    ],
    handler: async (args, ctx) => {
      ctx.logger.info("Syncing...", args);
    },
  },
],
```

Run with: `forkcart plugin run <plugin-name>:sync`

---

## Scheduled Tasks

Cron-style background tasks:

```ts
scheduledTasks: [
  {
    name: "cleanup-old-data",
    schedule: "0 3 * * *", // Daily at 3 AM (standard cron)
    enabled: true,
    handler: async (ctx) => {
      await ctx.db.execute(
        "DELETE FROM plugin_my_widget_logs WHERE created_at < NOW() - INTERVAL '90 days'",
      );
      ctx.logger.info("Cleaned up old logs");
    },
  },
],
```

Tasks are managed by the `PluginScheduler` and can be:

- **Listed:** `GET /api/v1/plugins/tasks`
- **Manually triggered:** `POST /api/v1/plugins/tasks/:taskKey/run`
- **Enabled/disabled:** `PUT /api/v1/plugins/tasks/:taskKey/toggle`

---

## Permissions

Declare what your plugin needs access to:

```ts
permissions: ['products:read', 'orders:read', 'customers:read'];
```

The `ScopedDatabase` enforces these at runtime — attempts to access tables outside your permissions throw an error. Plugin-owned tables (`plugin_<name>_*`) are always accessible regardless of permissions.

The scoped database also enforces a **rate limit** (default 100 queries/second) and logs slow queries (>500ms).

### Permission → Table Mapping

| Permission         | Tables                                                           | Write |
| ------------------ | ---------------------------------------------------------------- | ----- |
| `orders:read`      | `orders`, `order_items`                                          | No    |
| `orders:write`     | `orders`, `order_items`                                          | Yes   |
| `products:read`    | `products`, `product_images`, `product_translations`, `variants` | No    |
| `products:write`   | `products`, `product_images`, `product_translations`, `variants` | Yes   |
| `customers:read`   | `customers`                                                      | No    |
| `customers:write`  | `customers`                                                      | Yes   |
| `settings:read`    | `settings`, `theme_settings`                                     | No    |
| `settings:write`   | `settings`, `theme_settings`                                     | Yes   |
| `inventory:read`   | `products`, `variants`                                           | No    |
| `inventory:write`  | `products`, `variants`                                           | Yes   |
| `analytics:read`   | `search_logs`, `search_click_logs`                               | No    |
| `files:read`       | `media`                                                          | No    |
| `files:write`      | `media`                                                          | Yes   |
| `email:send`       | `email_logs`                                                     | Yes   |
| `payments:process` | `payments`, `orders`, `order_items`                              | Yes   |
| `webhooks:manage`  | `webhooks`                                                       | Yes   |
| `admin:full`       | **All tables**                                                   | Yes   |

---

## Plugin Dependencies

Require other plugins to be installed and active before your plugin can be activated:

```ts
dependencies: ['stripe', 'mailgun'];
minVersion: '0.5.0'; // Minimum ForkCart version
```

Dependencies are validated on activation. If any required plugin is missing or inactive, activation fails with a descriptive error listing all unmet dependencies.

---

## Plugin Installation & Loading

ForkCart discovers and loads plugins from multiple sources. Understanding this flow is essential for local plugin development.

### Discovery Directories

The `PluginLoader.discoverPlugins()` method scans a single directory:

1. **`data/plugins/`** — all plugins (registry-installed, uploaded ZIPs, and local development)

Each subdirectory is scanned for a valid plugin entry point. The loader also checks nested paths like `data/plugins/<slug>/forkcart-plugin-<slug>/` and `data/plugins/<slug>/<slug>/` to handle common ZIP extraction structures.

### How Plugins Are Loaded

**Local plugins** (from `data/plugins/`) are loaded using `file://` URL imports:

```
file:///path/to/plugin/dist/index.js
```

This means your local plugin must:

- Have `"type": "module"` in `package.json`
- Export a valid ES module from the entry point specified in `"main"`
- Be compiled to JS (the `dist/` directory must exist)

### Nested Directory Support

When plugins are installed from the registry (ZIP downloads), they may extract into nested structures:

```
data/plugins/fomo-badges/forkcart-plugin-fomo-badges/
```

The loader handles this automatically by checking:

1. `plugins/<slug>/` (direct)
2. `plugins/<slug>/forkcart-plugin-<slug>/` (nested from ZIP)
3. Any `forkcart-plugin-*` subfolder inside `plugins/<slug>/`

### Plugin Registration in Database

Once discovered, plugins are registered in the `plugins` DB table via `ensurePluginInDb()`. This stores:

- Plugin name, version, description, author
- Active/inactive state
- Settings (with encrypted secrets)
- Installation timestamp

### Installation Methods

**From Admin UI (Plugin Store):**

1. Go to **Plugins** → **Marketplace**
2. Browse or search plugins
3. Click **Install** (downloads ZIP from registry, extracts to `data/plugins/`)

**From CLI (npm):**

```bash
forkcart plugin install forkcart-plugin-my-awesome
forkcart plugin activate my-awesome
```

**From API:**

```bash
# Install via npm
POST /api/v1/plugins/install
Body: { "packageName": "forkcart-plugin-my-awesome" }

# Discover local plugins
POST /api/v1/plugins/discover

# Install from registry
POST /api/v1/store/:slug/install
```

**Manual (Local Development):**

1. Create your plugin in `data/plugins/my-plugin/` (or `packages/plugins/my-plugin/`)
2. Run `POST /api/v1/plugins/discover` to register it
3. Activate via the Admin UI or API

---

## Plugin Dev CLI (plugin:dev)

The `plugin:dev` command gives you a watch-build-reload loop for local plugin development:

```bash
npx forkcart plugin:dev <slug>
```

This will:

1. **Resolve** your plugin directory in `data/plugins/<slug>/`
2. **Build** `src/index.ts` → `dist/index.js` using esbuild (ESM, Node platform, bundled)
3. **Watch** the `src/` directory for `.ts`, `.js`, `.json`, and `.mjs` changes (200ms debounce)
4. **Rebuild** on every change
5. **Hot-reload** the plugin on the running server via `POST /api/v1/plugins/:id/reload`

### Options

| Option        | Default            | Description                                |
| ------------- | ------------------ | ------------------------------------------ |
| `-p, --port`  | `3000`             | ForkCart server port                       |
| `--host`      | `http://localhost` | ForkCart server host                       |
| `--no-reload` | —                  | Only rebuild on change, skip server reload |

### Example

```bash
# Watch and auto-reload on the default server
npx forkcart plugin:dev my-widget

# Custom port, no auto-reload (manual testing)
npx forkcart plugin:dev my-widget --port 4000 --no-reload
```

If the server isn't running, the CLI still builds — it just skips the reload step and prints a warning. You can use `--no-reload` for a pure build-watch workflow without a running ForkCart instance.

> **Tip:** The build creates a temporary `@forkcart/plugin-sdk` shim in `node_modules/` so esbuild can bundle without the SDK installed as a real dependency. This is the same approach the Plugin Store uses for server-side compilation.

---

## Plugin Preview & Sandbox

The admin panel includes a **Plugin Preview** modal that lets you inspect everything a plugin registers — without visiting the storefront.

**Opening the Preview:** In the admin **Plugins** list, click the preview (👁) button on any plugin. The modal opens as a full-screen overlay.

### The 3 Tabs

| Tab                    | Shows                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Storefront Slots**   | Every slot the plugin injects content into (e.g. `product-page-bottom`). Click a slot to expand and preview its rendered HTML.  |
| **PageBuilder Blocks** | All blocks the plugin provides for the drag-and-drop PageBuilder, with their icon, description, default slot, and page filters. |
| **Admin Widgets**      | Custom admin pages registered by the plugin. Click a page to load and preview its content inline.                               |

Each tab shows a count badge so you can see at a glance what a plugin contributes.

### Viewport Switcher

The top-right corner has a **Desktop / Tablet / Mobile** toggle (Monitor, Tablet, Smartphone icons). Switching viewport resizes the preview content area to `100%`, `768px`, or `375px` width — useful for checking how plugin output looks on different screen sizes.

> **Note:** If the plugin is inactive, the preview shows a warning instead of content. Inactive plugins don't register their slots, blocks, or admin pages — activate first.

---

## Hot Reload (Dev Mode)

In development (`NODE_ENV !== 'production'`), the loader can watch plugin directories for changes and auto-reload.

### How It Works

1. `fs.watch` monitors the plugin directory recursively
2. On `.js`, `.ts`, `.json`, or `.mjs` file changes, a debounced reload triggers (300ms)
3. The plugin is deactivated, its module is re-imported (cache-busted with timestamp), and it's reactivated
4. All hooks, routes, filters, and slots are re-registered

**Hot reload is disabled in production** (`NODE_ENV === 'production'`).

### Manual Reload Endpoint

Trigger a reload without file watching:

```
POST /api/v1/plugins/:id/reload
```

Response:

```json
{
  "data": {
    "success": true,
    "pluginName": "my-plugin",
    "reloadedAt": "2026-03-28T00:00:00.000Z"
  }
}
```

### Programmatic API

```ts
// Start watching
pluginLoader.watchPlugin('my-plugin');

// Stop watching
pluginLoader.unwatchPlugin('my-plugin');

// Stop all watchers
pluginLoader.unwatchAll();
```

---

## Plugin Store (Publishing & Installation)

### Publishing to the Marketplace

Your ZIP must contain:

```
my-plugin/
├── forkcart-plugin.json  ← Required manifest
├── package.json          ← Required (with "type": "module")
├── README.md             ← Required
├── dist/                 ← Compiled JS
│   └── index.js
└── src/                  ← Source (optional)
    └── index.ts
```

**Steps:**

1. Build your plugin: `pnpm build`
2. Create ZIP with all required files
3. Go to [ForkCart Developer Portal](https://developers.forkcart.com)
4. Upload your ZIP
5. Set pricing (free or paid — ForkCart takes 10%, you keep 90%)

**API methods:**

1. Submit via `POST /api/v1/store/submit` with plugin metadata
2. Publish versions via `PUT /api/v1/store/:slug/versions`
3. If a central registry is configured (`PLUGIN_REGISTRY_URL`), listings are synced

### Publishing as npm Package

```json
{
  "name": "forkcart-plugin-my-awesome",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "keywords": ["forkcart-plugin"],
  "peerDependencies": {
    "@forkcart/plugin-sdk": "^0.1.0"
  }
}
```

### Installation from Store

When a user installs from the Plugin Store:

1. ZIP is downloaded from the registry
2. Extracted to `data/plugins/<slug>/`
3. If source contains TypeScript (`src/index.ts`), it's auto-compiled via esbuild
4. Plugin is registered in the database with `metadata.source = 'registry'`
5. Plugin is auto-activated

### Updates

`POST /api/v1/store/:slug/update`:

1. Downloads latest ZIP from registry
2. Overwrites plugin directory
3. Re-compiles TypeScript if needed
4. Updates version in database
5. Hot-reloads the module (cache-busted `import()` with timestamp)

---

## Security Model

ForkCart's plugin system is designed with defense-in-depth. Understanding these security boundaries is important for both plugin authors and store administrators.

### ScopedDatabase

Plugins **never** receive the raw database handle. Instead, they get a `ScopedDatabase` proxy that enforces access control:

- **Plugin-owned tables** (`plugin_<name>_*`) are **always** accessible for read and write
- **Core tables** require matching permissions (e.g., `'orders:read'` to query orders)
- **`admin:full`** grants unrestricted access (avoid unless truly necessary)
- All queries are logged for audit purposes
- Unauthorized access throws an error and is logged as a warning

```ts
// Plugin with permissions: ['orders:read']
await ctx.db.query.orders.findMany(); // ✅ Works
await ctx.db.insert(orders).values({}); // ❌ Throws: no 'orders:write'
await ctx.db.execute('SELECT * FROM plugin_my_plugin_data'); // ✅ Always works
```

### Table Naming Convention (Enforced)

Plugin tables **must** be prefixed with `plugin_<plugin-name>_`:

```
plugin_<plugin-name>_<table>
```

The plugin name is sanitized (non-alphanumeric characters replaced with `_`). For example, plugin `fomo-badges` gets prefix `plugin_fomo_badges_`.

This is enforced by `ScopedDatabase` — the proxy always allows access to tables matching your plugin's prefix, regardless of declared permissions.

### Storefront HTML Sanitization

Plugin slot content is sanitized via `sanitize-html` before rendering. The sanitizer is **permissive by design** because plugins need JavaScript to function:

**Allowed tags include:**

- All standard HTML tags (div, span, p, h1-h6, etc.)
- **`<script>`**, **`<style>`**, **`<link>`** — plugins need JS/CSS
- **`<form>`**, `<input>`, `<textarea>`, `<select>` — for plugin widgets
- **`<iframe>`** — for embeds (YouTube, maps, etc.)
- **`<canvas>`**, **`<svg>`** and children — for charts and graphics

**Allowed attributes include:**

- Global: `class`, `id`, `style`, `data-*`, `aria-*`, `role`
- Script: `src`, `type`, `async`, `defer`, `crossorigin`, `integrity`
- Form: `action`, `method`, `type`, `name`, `value`, `placeholder`, etc.
- SVG: `viewBox`, `d`, `fill`, `stroke`, `transform`, etc.
- iframe: `src`, `sandbox`, `allow`, `loading`

**Inline styles** are allowed with common CSS properties (color, background, display, position, flex, grid, etc.).

**Security rationale:** This mirrors the trust model of Shopware, WooCommerce, and Magento — plugins are installed by store admins who review them, and marketplace plugins go through review before publishing. Future versions may add CSP nonce support for stricter environments.

### Package Name Validation

The `installPlugin()` method validates package names against a strict regex to prevent command injection:

```
/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[a-zA-Z0-9._-]+)?$/
```

### Query Stats & Rate Limiting

The `ScopedDatabase` tracks query metrics per plugin and enforces rate limits to prevent runaway plugins from degrading performance.

**Rate Limiting:** Each plugin is limited to **100 queries per second** by default. Exceeding this throws:

```
Plugin 'my-plugin' exceeded query rate limit (100/s)
```

**Slow Query Logging:** Any query taking longer than **500ms** is logged as a warning:

```
WARN [scoped-database] Slow plugin query detected { pluginName: 'my-plugin', operation: 'execute', durationMs: 1234 }
```

**Query Statistics:** Access stats from the plugin context:

```ts
const stats = ctx.db.getStats();
// { totalQueries: 42, slowQueries: 1, lastQueryAt: Date }
```

All operations are tracked: `execute`, `insert`, `update`, `delete`, and `select`.

---

## Health Checks & Conflict Detection

### Health Checks

```
GET /api/v1/plugins/health          — All active plugins
GET /api/v1/plugins/:id/health      — Detailed report for one plugin
```

The detailed report includes:

```json
{
  "data": {
    "pluginId": "uuid-here",
    "pluginName": "my-plugin",
    "healthy": true,
    "isActive": true,
    "migrations": {
      "status": "applied",
      "total": 2,
      "applied": 2,
      "pending": 0,
      "failed": false
    },
    "settings": {
      "valid": true,
      "issues": []
    },
    "routes": {
      "registered": true,
      "hasDefinition": true
    },
    "dependencies": {
      "satisfied": true,
      "issues": []
    },
    "hooks": 3,
    "filters": 1,
    "lastError": null
  }
}
```

| Field          | Description                                                                     |
| -------------- | ------------------------------------------------------------------------------- |
| `healthy`      | `true` if migrations are applied, required settings are filled, and deps are OK |
| `migrations`   | Status of database migrations — `pending`, `applied`, or `failed`               |
| `settings`     | Whether all `required: true` settings have values                               |
| `routes`       | Whether the plugin's custom routes are registered                               |
| `dependencies` | Whether all declared dependencies are installed and active                      |
| `lastError`    | First detected issue, or `null` if healthy                                      |

### Conflict Detection

```
GET /api/v1/plugins/conflicts
```

Detects and returns an array of conflicts:

```json
{
  "data": [
    {
      "type": "route",
      "plugins": ["plugin-a", "plugin-b"],
      "detail": "Multiple plugins register route: GET /status"
    }
  ],
  "hasConflicts": true
}
```

| Conflict Type | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `route`       | Two plugins register the same HTTP method + path               |
| `hook`        | Two plugins hook and filter the same event                     |
| `slot`        | Two plugins claim the same storefront slot with the same order |
| `block`       | Two plugins register a PageBuilder block with the same name    |

**Programmatic API:**

```ts
const conflicts = pluginLoader.detectConflicts();
// Returns: Array<{ type: string, plugins: string[], detail: string }>
```

---

## Provider Implementations

Plugins with specific `type` values can implement provider interfaces for payment, marketplace, email, and shipping.

### Payment Provider

```ts
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'stripe',
  version: '1.0.0',
  type: 'payment',
  description: 'Accept payments via Stripe',
  author: 'ForkCart',

  settings: {
    secretKey: {
      type: 'string',
      label: 'Secret Key',
      required: true,
      secret: true,
    },
    publishableKey: {
      type: 'string',
      label: 'Publishable Key',
      required: true,
    },
    webhookSecret: { type: 'string', label: 'Webhook Secret', secret: true },
  },

  provider: {
    async initialize(settings) {
      // Initialize Stripe client
    },

    isConfigured() {
      return Boolean(this.secretKey && this.publishableKey);
    },

    getClientConfig() {
      return {
        provider: 'stripe',
        displayName: 'Credit Card',
        componentType: 'stripe-elements',
        clientConfig: { publishableKey: this.publishableKey },
      };
    },

    async createPaymentIntent(input) {
      return {
        clientSecret: 'pi_xxx_secret_xxx',
        externalId: 'pi_xxx',
        amount: input.amount,
        currency: input.currency,
      };
    },

    async verifyWebhook(rawBody, headers) {
      return {
        type: 'payment.succeeded',
        externalId: 'pi_xxx',
        amount: 2999,
        currency: 'usd',
        metadata: {},
        rawEvent: {},
      };
    },

    async getPaymentStatus(externalId) {
      return {
        status: 'succeeded',
        externalId,
        amount: 2999,
        currency: 'usd',
      };
    },
  },
});
```

### Marketplace Provider

```ts
export default definePlugin({
  name: 'amazon',
  version: '1.0.0',
  type: 'marketplace',
  description: 'Sell on Amazon',
  author: 'ForkCart',

  settings: {
    sellerId: { type: 'string', label: 'Seller ID', required: true },
    accessKey: {
      type: 'string',
      label: 'Access Key',
      required: true,
      secret: true,
    },
    secretKey: {
      type: 'string',
      label: 'Secret Key',
      required: true,
      secret: true,
    },
    region: {
      type: 'select',
      label: 'Region',
      options: ['NA', 'EU', 'FE'],
      default: 'EU',
    },
  },

  provider: {
    async connect(settings) {},
    async disconnect() {},
    async testConnection() {
      return { ok: true };
    },
    async listProduct(product) {
      return {
        id: 'listing_123',
        marketplaceId: 'amazon',
        externalId: 'ASIN123',
        status: 'active',
        url: 'https://amazon.com/dp/ASIN123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
    async updateListing(listingId, product) {},
    async deleteListing(listingId) {},
    async fetchOrders(since) {
      return [];
    },
    async acknowledgeOrder(orderId) {},
    async updateShipment(orderId, tracking) {},
    async updateInventory(sku, quantity) {},
    async bulkUpdateInventory(items) {},
    async getMarketplaceCategories() {
      return [];
    },
  },
});
```

### Email Provider

```ts
export default definePlugin({
  name: 'mailgun',
  version: '1.0.0',
  type: 'email',
  description: 'Send emails via Mailgun',
  author: 'ForkCart',

  settings: {
    apiKey: {
      type: 'string',
      label: 'API Key',
      required: true,
      secret: true,
    },
    domain: { type: 'string', label: 'Domain', required: true },
    region: {
      type: 'select',
      label: 'Region',
      options: ['US', 'EU'],
      default: 'US',
    },
  },

  provider: {
    async initialize(settings) {},
    isConfigured() {
      return true;
    },
    async sendEmail(input) {
      return { messageId: 'msg_xxx', accepted: true };
    },
  },
});
```

### Shipping Provider

```ts
export default definePlugin({
  name: 'dhl',
  version: '1.0.0',
  type: 'shipping',
  description: 'Ship with DHL',
  author: 'ForkCart',

  settings: {
    apiKey: {
      type: 'string',
      label: 'API Key',
      required: true,
      secret: true,
    },
    accountNumber: {
      type: 'string',
      label: 'Account Number',
      required: true,
    },
  },

  provider: {
    async initialize(settings) {},

    async getRates(from, to, parcels) {
      return [
        {
          id: 'dhl_express',
          name: 'DHL Express',
          price: 1299,
          currency: 'EUR',
          estimatedDays: 2,
          carrier: 'DHL',
        },
      ];
    },

    async createShipment(from, to, parcels, rateId) {
      return {
        trackingNumber: '1234567890',
        carrier: 'DHL',
        labelUrl: 'https://...',
        trackingUrl: 'https://...',
      };
    },

    async getTracking(trackingNumber) {
      return [
        {
          status: 'in_transit',
          location: 'Leipzig, DE',
          timestamp: new Date(),
          description: 'Package in transit',
        },
      ];
    },
  },
});
```

---

## Best Practices

1. **Use TypeScript** — Better DX, catches errors early, full IDE autocomplete with `definePlugin()`
2. **Handle errors gracefully** — Don't crash the main app (hook/filter errors are caught automatically). Use `onError` for error tracking (Sentry, etc.)
3. **Use the settings schema** — Don't hardcode configuration. The admin panel auto-generates forms for you
4. **Mark secrets as `secret: true`** — They'll be encrypted at rest with AES-256-GCM
5. **Document your plugin** — Include a README.md (required for marketplace publishing)
6. **Test thoroughly** — Especially payment/order flows
7. **Version your migrations** — Never modify existing ones, always add new versions
8. **Declare permissions** — Only request what you need. Avoid `admin:full` unless truly necessary
9. **Clean up on uninstall** — Remove data and tables when plugin is removed via `onUninstall`
10. **Use `"type": "module"`** — Required for local plugin loading
11. **Use `ref()` in migrations** — Never hardcode column types when referencing core tables
12. **Keep plugin names consistent** — The `name` in `definePlugin()` should be a kebab-case slug. Use `forkcart-plugin.json` for the pretty display name

### Naming Conventions

**Database Tables:** Always prefix with `plugin_<your-plugin-name>_`

```ts
// ✅ CORRECT — table name matches plugin name
name: 'fomo-badges',
migrations: [{
  up: async (db) => {
    await db.execute(`CREATE TABLE plugin_fomo_badges_stats (...)`);
  }
}]

// ❌ WRONG — table name doesn't match plugin name
name: 'fomo-badges',
migrations: [{
  up: async (db) => {
    await db.execute(`CREATE TABLE plugin_social_proof_stats (...)`);  // Wrong prefix!
  }
}]
```

**Route Endpoints:** Auto-mounted at `/api/v1/public/plugins/<plugin-slug>/`

---

## Troubleshooting & Common Gotchas

### Plugin Not Discovered

**Symptom:** `POST /api/v1/plugins/discover` doesn't find your plugin.

**Checklist:**

1. Is your plugin in `data/plugins/<slug>/`?
2. Does `package.json` exist in the plugin root?
3. Does `package.json` have `"keywords": ["forkcart-plugin"]` or a name starting with `forkcart-plugin-`?
4. Is the plugin already registered? (The loader skips already-known plugins)

### Plugin Fails to Load (ES Module Errors)

**Symptom:** `ERR_REQUIRE_ESM` or `Cannot use import statement outside a module`

**Fix:** Ensure your `package.json` has:

```json
{
  "type": "module",
  "main": "dist/index.js",
  "exports": { ".": { "import": "./dist/index.js" } }
}
```

Also ensure your compiled output (`dist/`) uses ES module syntax (`export default`, not `module.exports`).

### "Invalid plugin definition — missing name/version/type"

**Fix:** Your default export must include `name`, `version`, and `type`:

```ts
export default definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  type: 'general',
  description: '...',
  author: '...',
});
```

### The `dist/` Stale Problem

If you edit `src/index.ts` but forget to rebuild, the loader imports the old `dist/index.js`. Always rebuild before testing. Use `npx forkcart plugin:dev <slug>` for automatic watch-build-reload, or the Plugin Store auto-compiles with esbuild.

### Display Name vs Technical Name

The DB stores the **display name** (e.g., "Nyx Recommendations") from the first registration. The SDK uses the **technical name** (e.g., "nyx-recommendations") from `definePlugin({ name: ... })`. The loader tries both when looking up plugins, plus the `slug` from `forkcart-plugin.json`. But if they diverge badly, things can break.

**Rule of thumb:** Keep `name` in `definePlugin()` as a kebab-case slug. Use `forkcart-plugin.json` for the pretty display name.

### ZIP Nested Directory Problem

When extracting plugin ZIPs, the contents often end up nested: `data/plugins/my-widget/my-widget/`. The loader handles this by checking multiple paths, but deeply nested or unusually structured ZIPs can still cause "plugin code not found" errors.

### Scripts in Suspense Boundaries Don't Execute

Never rely on raw `<script>` tags in plugin HTML content. They **will not run** inside React Suspense boundaries. ForkCart handles this automatically via [ScriptExecutor](#scriptexecutor--why-this-exists) for `storefrontSlots` and `pageBuilderBlocks` content.

### Plugin Table Naming

Custom tables **must** use the `plugin_<name>_` prefix. The `ScopedDatabase` proxy blocks access to unprefixed tables unless you have the matching permission. Replace non-alphanumeric chars in the plugin name with underscores for the prefix.

### Settings Re-initialization on Change

When plugin settings are updated via the admin panel, the plugin is **deactivated and re-activated**. This means `onDeactivate` + `onActivate` fire, and all hooks/routes are re-registered. Design your plugin to handle this gracefully.

### Secret Settings and the Admin API

Settings marked `secret: true` are stored encrypted and returned as `"••••••••"` in the admin API response. When the admin saves settings, the loader only encrypts values that aren't already the masked string — so round-tripping won't corrupt the actual secret.

### Migration Fails

**Common causes:**

- Table name doesn't have the `plugin_<name>_` prefix
- SQL syntax error
- Type mismatch: used `VARCHAR(255)` for a column that references a `UUID` core column — use `ref()` instead

### Permission Denied on Database Access

**Fix:** Add the required permission to your plugin definition:

```ts
permissions: ['orders:read']; // Add the permission you need
```

### Storefront Slot Content Not Showing

**Checklist:**

1. Is the plugin active?
2. Is the slot name correct? (See [Available Storefront Slots](#available-storefront-slots))
3. Does the slot have `pages` restrictions that don't match the current page?
4. Check the API directly: `GET /api/v1/public/plugins/slots/<slot-name>`
5. Storefront caches slot content for 60 seconds — wait or restart the dev server

### Unmet Dependencies Error

**Fix:** Install and activate the required plugins first, then retry activating your plugin.

---

## Full API Reference

### Plugin Management Endpoints

| Method | Endpoint                         | Description                       |
| ------ | -------------------------------- | --------------------------------- |
| GET    | `/api/v1/plugins`                | List all plugins                  |
| GET    | `/api/v1/plugins/:id`            | Get plugin details                |
| POST   | `/api/v1/plugins/discover`       | Discover local plugins            |
| POST   | `/api/v1/plugins/install`        | Install plugin from npm           |
| PUT    | `/api/v1/plugins/:id/activate`   | Activate a plugin                 |
| PUT    | `/api/v1/plugins/:id/deactivate` | Deactivate a plugin               |
| DELETE | `/api/v1/plugins/:id`            | Uninstall a plugin                |
| POST   | `/api/v1/plugins/:id/reload`     | Hot-reload a plugin               |
| GET    | `/api/v1/plugins/health`         | Health check (all active plugins) |
| GET    | `/api/v1/plugins/:id/health`     | Health check (single plugin)      |
| GET    | `/api/v1/plugins/conflicts`      | Detect conflicts between plugins  |

### Plugin Store Endpoints

| Method | Endpoint                       | Description              |
| ------ | ------------------------------ | ------------------------ |
| POST   | `/api/v1/store/submit`         | Submit plugin to store   |
| PUT    | `/api/v1/store/:slug/versions` | Publish a new version    |
| POST   | `/api/v1/store/:slug/install`  | Install from registry    |
| POST   | `/api/v1/store/:slug/update`   | Update to latest version |

### Public Plugin Endpoints

| Method | Endpoint                                       | Description                    |
| ------ | ---------------------------------------------- | ------------------------------ |
| GET    | `/api/v1/public/plugins/slots/:slotName`       | Get slot content               |
| GET    | `/api/v1/public/plugins/blocks`                | List all PageBuilder blocks    |
| GET    | `/api/v1/public/plugins/blocks/fallbacks`      | Get fallback blocks for a page |
| GET    | `/api/v1/public/plugins/pages`                 | List all storefront pages      |
| GET    | `/api/v1/public/plugins/pages/*`               | Get storefront page content    |
| \*     | `/api/v1/public/plugins/<plugin-slug>/<route>` | Custom plugin routes           |

### Scheduled Task Endpoints

| Method | Endpoint                                | Description           |
| ------ | --------------------------------------- | --------------------- |
| GET    | `/api/v1/plugins/tasks`                 | List all tasks        |
| POST   | `/api/v1/plugins/tasks/:taskKey/run`    | Manually trigger task |
| PUT    | `/api/v1/plugins/tasks/:taskKey/toggle` | Enable/disable task   |

### Available Events

| Event                 | Payload includes                                  |
| --------------------- | ------------------------------------------------- |
| `order:created`       | orderId, customerId, totalAmount, currency, items |
| `order:paid`          | orderId, paymentId, amount, currency, provider    |
| `order:shipped`       | orderId, trackingNumber                           |
| `order:cancelled`     | orderId, reason                                   |
| `order:refunded`      | orderId, amount                                   |
| `product:created`     | productId, name, sku                              |
| `product:updated`     | productId, changes                                |
| `product:deleted`     | productId                                         |
| `cart:created`        | cartId                                            |
| `cart:updated`        | cartId, items                                     |
| `cart:item-added`     | cartId, productId, quantity                       |
| `cart:item-removed`   | cartId, productId                                 |
| `customer:registered` | customerId, email                                 |
| `customer:updated`    | customerId, changes                               |
| `checkout:started`    | cartId, customerId                                |
| `checkout:completed`  | orderId, cartId                                   |
| `inventory:updated`   | productId, variantId, quantity                    |
| `inventory:low`       | productId, variantId, currentQuantity, threshold  |
| `plugin:activated`    | pluginName                                        |
| `plugin:deactivated`  | pluginName                                        |

### Available Filters

| Filter                      | Input type | Description                              |
| --------------------------- | ---------- | ---------------------------------------- |
| `product:price`             | `number`   | Modify product price                     |
| `product:title`             | `string`   | Modify product title                     |
| `product:description`       | `string`   | Modify product description               |
| `cart:total`                | `number`   | Modify cart total                        |
| `cart:shipping`             | `number`   | Modify shipping cost                     |
| `cart:tax`                  | `number`   | Modify tax amount                        |
| `checkout:payment-methods`  | `array`    | Filter/modify available payment methods  |
| `checkout:shipping-methods` | `array`    | Filter/modify available shipping methods |
| `order:confirmation-email`  | `object`   | Modify order confirmation email          |
| `search:results`            | `array`    | Filter/transform search results          |
| `search:query`              | `string`   | Modify search query                      |
| `admin:menu`                | `array`    | Customize admin menu items               |
| `storefront:head`           | `string`   | Inject into `<head>`                     |
| `storefront:footer`         | `string`   | Inject into footer                       |

### Available Storefront Slots

| Slot                      | Location                |
| ------------------------- | ----------------------- |
| `head`                    | Inside `<head>`         |
| `body-start`              | Start of `<body>`       |
| `body-end`                | End of `<body>`         |
| `header-before`           | Before header           |
| `header-after`            | After header            |
| `footer-before`           | Before footer           |
| `footer-after`            | After footer            |
| `product-page-top`        | Top of product page     |
| `product-page-bottom`     | Bottom of product page  |
| `product-page-sidebar`    | Product page sidebar    |
| `cart-page-top`           | Top of cart page        |
| `cart-page-bottom`        | Bottom of cart page     |
| `checkout-before-payment` | Before payment form     |
| `checkout-after-payment`  | After payment form      |
| `category-page-top`       | Top of category page    |
| `category-page-bottom`    | Bottom of category page |

---

## Full Examples

### Discount Codes Plugin

```ts
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'discount-codes',
  version: '1.0.0',
  type: 'general',
  description: 'Add discount code functionality',
  author: 'ForkCart',
  keywords: ['discount', 'coupon', 'promo'],

  settings: {
    maxUsesPerCode: { type: 'number', label: 'Max Uses', default: 100 },
    allowStacking: {
      type: 'boolean',
      label: 'Allow Stacking',
      default: false,
    },
  },

  permissions: ['orders:read', 'orders:write'],

  filters: {
    'cart:total': (total, ctx) => {
      // Apply discount logic
      return total;
    },
  },

  hooks: {
    'order:created': async (event, ctx) => {
      // Track discount usage
    },
  },

  routes: (router) => {
    router.post('/validate', async (c) => {
      const { code } = await c.req.json();
      return c.json({ valid: true, discount: 10 });
    });
  },

  adminPages: [{ path: '/discounts', label: 'Discount Codes', icon: 'tag' }],

  cli: [
    {
      name: 'create',
      description: 'Create a discount code',
      handler: async (args, ctx) => {
        ctx.logger.info('Creating code...');
      },
    },
  ],

  migrations: [
    {
      version: '1.0.0',
      description: 'Create discount_codes table',
      up: async (db) => {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS plugin_discount_codes_codes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT UNIQUE NOT NULL,
            percent INTEGER NOT NULL,
            max_uses INTEGER DEFAULT 100,
            current_uses INTEGER DEFAULT 0,
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      },
      down: async (db) => {
        await db.execute('DROP TABLE IF EXISTS plugin_discount_codes_codes;');
      },
    },
  ],

  onInstall: async (ctx) => {
    ctx.logger.info('Discount codes plugin installed!');
  },
});
```

### Nyx Recommendations Plugin

See [`data/plugins/nyx-recommendations/`](../packages/api/data/plugins/nyx-recommendations/) for a full real-world plugin demonstrating:

- Settings with all types (string, number, boolean, select)
- Event hooks (`order:paid`)
- Custom API routes with database queries
- Admin page with dynamic `apiRoute`
- PageBuilder block with JavaScript widget
- Database migrations using `ref()`
- CLI commands
- Scheduled tasks
- Error handling via `onError`
- Startup warmup via `onReady`

---

## Need Help?

- [GitHub Issues](https://github.com/forkcart/forkcart/issues)
- [Discord Community](https://discord.gg/forkcart)
- [API Documentation](./API.md)

---

_Built with 🦞 by the ForkCart team._
