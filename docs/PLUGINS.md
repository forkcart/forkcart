# ForkCart Plugin Development Guide

Build plugins that extend ForkCart — payment providers, marketplaces, email services, shipping, analytics, and custom features.

## Table of Contents

- [Quick Start](#quick-start)
- [Plugin Types](#plugin-types)
- [Plugin Installation & Loading](#plugin-installation--loading)
- [Package.json Requirements](#packagejson-requirements)
- [Settings Schema](#settings-schema)
- [Event Hooks](#event-hooks)
- [Filters (Data Transformation)](#filters-data-transformation)
- [Storefront Slots](#storefront-slots)
- [Storefront Integration](#storefront-integration)
- [PageBuilder Blocks](#pagebuilder-blocks)
- [Custom API Routes](#custom-api-routes)
- [Admin Pages](#admin-pages)
- [CLI Commands](#cli-commands)
- [Scheduled Tasks](#scheduled-tasks)
- [Database Migrations](#database-migrations)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Plugin Context](#plugin-context)
- [Permissions](#permissions)
- [Security Model](#security-model)
- [Plugin Dependencies](#plugin-dependencies)
- [Health Check API](#health-check-api)
- [Dev Mode & Hot Reload](#dev-mode--hot-reload)
- [Conflict Detection](#conflict-detection)
- [Query Stats & Rate Limiting](#query-stats--rate-limiting)
- [Provider Implementations](#provider-implementations)
- [Full Example: Discount Codes Plugin](#full-example-discount-codes-plugin)
- [Publishing](#publishing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Need Help?](#need-help)

---

## Quick Start

### 1. Create Plugin Structure

```
my-plugin/
├── src/
│   └── index.ts          # Plugin definition
├── forkcart-plugin.json  # Plugin manifest (required for marketplace)
├── package.json          # NPM package info (must have "type": "module")
├── README.md             # Documentation
└── tsconfig.json
```

### 2. Create the Manifest (`forkcart-plugin.json`)

```json
{
  "name": "My Awesome Plugin",
  "slug": "my-awesome-plugin",
  "packageName": "forkcart-plugin-my-awesome",
  "version": "1.0.0",
  "type": "general",
  "description": "Does awesome things",
  "author": "Your Name",
  "license": "MIT",
  "minForkcartVersion": "0.5.0",
  "entryPoint": "dist/index.js"
}
```

| Field                | Required | Description                                      |
| -------------------- | -------- | ------------------------------------------------ |
| `name`               | ✅       | Human-readable plugin name                       |
| `slug`               | ✅       | URL-safe identifier (lowercase, hyphens)         |
| `packageName`        | ✅       | NPM package name                                 |
| `version`            | ✅       | Semver version                                   |
| `type`               | ✅       | Plugin type (see below)                          |
| `description`        |          | Short description for marketplace                |
| `author`             |          | Author name                                      |
| `license`            |          | License (MIT, GPL-3.0, etc.)                     |
| `minForkcartVersion` |          | Minimum ForkCart version required                |
| `entryPoint`         |          | Path to compiled JS entry point (default: dist/) |

### 3. Define Your Plugin

```typescript
// src/index.ts
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'my-awesome-plugin',
  version: '1.0.0',
  type: 'general',
  description: 'Does awesome things',
  author: 'Your Name',

  settings: {
    apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
    enabled: { type: 'boolean', label: 'Enabled', default: true },
  },

  hooks: {
    'order:created': async (event, ctx) => {
      ctx.logger.info('New order!', { orderId: event.payload.orderId });
    },
  },
});
```

---

## Plugin Types

| Type          | Purpose                                    |
| ------------- | ------------------------------------------ |
| `payment`     | Payment gateways (Stripe, PayPal, Klarna)  |
| `marketplace` | External marketplaces (Amazon, eBay, Otto) |
| `email`       | Email providers (Mailgun, SendGrid, SMTP)  |
| `shipping`    | Shipping & carriers (DHL, FedEx, UPS)      |
| `analytics`   | Tracking & analytics (GA4, Plausible)      |
| `general`     | Everything else                            |

---

## Plugin Installation & Loading

ForkCart discovers and loads plugins from multiple sources. Understanding this flow is essential for local plugin development.

### Discovery Directories

The `PluginLoader.discoverPlugins()` method scans these directories in order:

1. **`node_modules/`** — npm-installed plugins
   - Top-level `forkcart-plugin-*` packages
   - Scoped `@forkcart/plugin-*` packages
2. **`packages/plugins/`** — monorepo local plugins (development)
3. **`data/plugins/`** — registry-installed plugins (downloaded ZIPs)
4. **`plugins/`** — standalone local plugins (alternative directory)

Each directory is scanned for subdirectories containing a `package.json` with either:

- The `"forkcart-plugin"` keyword in `keywords`
- A package name starting with `forkcart-plugin-` or `@forkcart/plugin-`

### How Plugins Are Loaded

**npm packages** are imported via `import('package-name')` (standard Node.js resolution).

**Local plugins** (from `packages/plugins/`, `data/plugins/`, or `plugins/`) are loaded using `file://` URL imports:

```
file:///path/to/plugin/dist/index.js
```

This means your local plugin must:

- Have `"type": "module"` in `package.json`
- Export a valid ES module from the entry point specified in `"main"`
- Be compiled to JS (the `dist/` directory must exist)

### Nested Directory Support

When plugins are installed from the registry (ZIP downloads), they may extract into nested structures like:

```
packages/plugins/fomo-badges/forkcart-plugin-fomo-badges/
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
3. Click **Install** (downloads ZIP from registry, extracts to `packages/plugins/`)

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

1. Create your plugin in `packages/plugins/my-plugin/`
2. Run `POST /api/v1/plugins/discover` to register it
3. Activate via the Admin UI or API

---

## Package.json Requirements

Your plugin's `package.json` must meet these requirements for the loader to import it:

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

**Critical fields:**

| Field      | Required | Why                                                      |
| ---------- | -------- | -------------------------------------------------------- |
| `type`     | ✅       | Must be `"module"` — plugins are loaded as ES modules    |
| `main`     | ✅       | Entry point for the loader (defaults to `dist/index.js`) |
| `exports`  | ✅       | Proper ESM exports map for Node.js resolution            |
| `keywords` | ✅       | Must include `"forkcart-plugin"` for auto-discovery      |

**Naming convention:** Package name should be `forkcart-plugin-<slug>` or `@forkcart/plugin-<slug>`.

---

## Settings Schema

Define settings that auto-generate admin UI forms:

```typescript
settings: {
  // Text input
  apiKey: {
    type: 'string',
    label: 'API Key',
    required: true,
    secret: true,        // Masked in UI, encrypted in DB
    placeholder: 'sk_...',
    description: 'Your secret API key',
  },

  // Number input
  timeout: {
    type: 'number',
    label: 'Timeout (seconds)',
    default: 30,
    min: 1,
    max: 300,
  },

  // Checkbox
  sandboxMode: {
    type: 'boolean',
    label: 'Sandbox Mode',
    default: false,
  },

  // Dropdown
  region: {
    type: 'select',
    label: 'Region',
    options: ['US', 'EU', 'APAC'],
    default: 'US',
  },
}
```

### Secret Settings Encryption

Settings marked with `secret: true` are automatically encrypted at rest using AES-256-GCM. They are:

- Encrypted before being stored in the database
- Decrypted when passed to plugin handlers via `ctx.settings`
- Displayed as `••••••••` in the Admin API responses

---

## Event Hooks

React to domain events:

```typescript
hooks: {
  // Order lifecycle
  'order:created': async (event, ctx) => { },
  'order:paid': async (event, ctx) => { },
  'order:shipped': async (event, ctx) => { },
  'order:cancelled': async (event, ctx) => { },
  'order:refunded': async (event, ctx) => { },

  // Product events
  'product:created': async (event, ctx) => { },
  'product:updated': async (event, ctx) => { },
  'product:deleted': async (event, ctx) => { },

  // Cart events
  'cart:created': async (event, ctx) => { },
  'cart:updated': async (event, ctx) => { },
  'cart:item-added': async (event, ctx) => { },
  'cart:item-removed': async (event, ctx) => { },

  // Customer events
  'customer:registered': async (event, ctx) => { },
  'customer:updated': async (event, ctx) => { },

  // Checkout events
  'checkout:started': async (event, ctx) => { },
  'checkout:completed': async (event, ctx) => { },

  // Inventory events
  'inventory:updated': async (event, ctx) => { },
  'inventory:low': async (event, ctx) => { },

  // Plugin events
  'plugin:activated': async (event, ctx) => { },
  'plugin:deactivated': async (event, ctx) => { },
}
```

### Event Payloads

```typescript
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

You can import typed event constants from the SDK:

```typescript
import { PLUGIN_EVENTS } from '@forkcart/plugin-sdk';

// Use PLUGIN_EVENTS.ORDER_CREATED instead of 'order:created'
```

---

## Filters (Data Transformation)

Transform data as it flows through the system (inspired by WordPress `apply_filters`):

```typescript
filters: {
  // Modify product price
  'product:price': (price, ctx) => {
    return price * 0.9; // 10% off everything
  },

  // Filter search results
  'search:results': (results, ctx) => {
    return results.filter(p => p.isAvailable);
  },

  // Modify cart totals
  'cart:total': (total, ctx) => total,
  'cart:shipping': (shipping, ctx) => shipping,
  'cart:tax': (tax, ctx) => tax,

  // Checkout customization
  'checkout:payment-methods': (methods, ctx) => methods,
  'checkout:shipping-methods': (methods, ctx) => methods,

  // Order confirmation
  'order:confirmation-email': (email, ctx) => email,

  // Search
  'search:query': (query, ctx) => query,

  // Admin menu customization
  'admin:menu': (menu, ctx) => menu,

  // Storefront injection
  'storefront:head': (html, ctx) => html,
  'storefront:footer': (html, ctx) => html,
}
```

Filters are applied in priority order (default priority: 10). If a filter handler throws, the data is returned unmodified.

---

## Storefront Slots

Inject HTML into the storefront:

```typescript
storefrontSlots: [
  {
    slot: 'header-after',
    content: '<div class="announcement">Free shipping over $50!</div>',
    order: 10,
  },
  {
    slot: 'product-page-bottom',
    content: '<img src="/trust-badge.png" alt="Trusted" />',
    pages: ['/product/*'],
  },
];
```

**Available slots:**

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

### How Slots Are Rendered

The `StorefrontSlot` component is a **Next.js Server Component** that:

1. Fetches slot content from the API: `GET /api/v1/public/plugins/slots/:slotName`
2. Separates HTML from `<script>` tags
3. Sanitizes the HTML through `sanitize-html` (see [Security Model](#security-model))
4. Renders the HTML via `dangerouslySetInnerHTML`
5. Renders scripts separately via `<script dangerouslySetInnerHTML>` so they execute

Slot content is cached with `revalidate: 60` (1 minute) by Next.js.

---

## Storefront Integration

### `window.FORKCART` Global Object

ForkCart exposes a global `window.FORKCART` object that plugins can use to access page context:

**Available on all pages:**

```javascript
window.FORKCART.apiUrl; // The API base URL (e.g., "http://localhost:3001")
```

**Available on product pages:**

```javascript
window.FORKCART.productId; // Current product ID (UUID)
window.FORKCART.productSlug; // Current product slug (e.g., "blue-widget")
```

The product data is set via a `useEffect` in the product content component and cleaned up on unmount.

### Accessing Plugin Settings from the Storefront

Don't hardcode settings in inline JS. Use the injected config pattern:

```typescript
// ✅ CORRECT — use injected settings
storefrontSlots: [
  {
    slot: 'product-page-bottom',
    content: `
    <script>
      const settings = window.FORKCART?.pluginSettings?.['my-plugin'] || {};
      const minViewers = settings.minViewers || 2;
      // Use the product context
      const productId = window.FORKCART?.productId;
      if (productId) {
        // Fetch data for this product from your plugin API
        fetch(window.FORKCART.apiUrl + '/api/v1/plugins/my-plugin/stats?product=' + productId)
          .then(r => r.json())
          .then(data => { /* render widget */ });
      }
    </script>
  `,
  },
];
```

### Storefront Slot API Endpoint

Plugin slot content is served from:

```
GET /api/v1/public/plugins/slots/:slotName?page=<currentPage>
```

This is a **public** endpoint (no auth required) so the storefront can fetch it server-side. The `page` query parameter filters slots that have `pages` restrictions.

---

## PageBuilder Blocks

Plugins can register custom blocks that appear in the admin's Craft.js PageBuilder. The killer feature: blocks have a **fallback mechanism** — if the admin hasn't placed your block in the page template, it automatically renders at a default slot position. Plugins work out of the box, but admins get full control.

### Registering Blocks

```typescript
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'fomo-badges',
  version: '1.0.0',
  type: 'general',
  description: 'Social proof badges for products',
  author: 'Acme Corp',

  pageBuilderBlocks: [
    {
      name: 'fomo-widget',
      label: 'FOMO Widget',
      icon: '🔥',
      category: 'Social Proof',
      description: 'Shows recent purchases and visitor count',
      content: `
        <div class="fomo-widget" id="fomo-widget-root">
          <p>Loading social proof...</p>
        </div>
        <script>
          // Your widget JS runs here
          document.getElementById('fomo-widget-root').innerHTML =
            '<p>🔥 12 people bought this in the last hour</p>';
        </script>
      `,
      defaultSlot: 'product-page-bottom', // Fallback if not placed by admin
      defaultOrder: 5,
      pages: ['/product/*'], // Only on product pages
    },
  ],
});
```

### Block Definition

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

This means plugins work immediately after installation with no admin setup, but admins can customize placement whenever they want.

### API Endpoints

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

### Storefront Usage

In your page layouts, use `PluginBlockFallback` alongside existing `StorefrontSlot`:

```tsx
import { StorefrontSlot } from '@/components/plugins/StorefrontSlot';
import { PluginBlockFallback } from '@/components/plugins/PluginBlockFallback';
import { extractPlacedPluginBlocks } from '@/components/plugins/extract-placed-blocks';

export default async function ProductPage({ pageContent }) {
  // Extract which plugin blocks the admin already placed in the template
  const placedBlocks = extractPlacedPluginBlocks(pageContent);

  return (
    <div>
      {/* ... product content ... */}

      {/* Existing slot-based plugin content */}
      <StorefrontSlot slotName="product-page-bottom" />

      {/* Plugin blocks that weren't placed in PageBuilder → render at default slot */}
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

### Admin PageBuilder Integration

Plugin blocks automatically appear in the admin PageBuilder's block picker under a **🧩 Plugins** section. No admin configuration is required — as soon as a plugin with `pageBuilderBlocks` is installed, its blocks show up.

**How it works:**

1. The Component Panel fetches registered blocks from `GET /api/v1/public/plugins/blocks`
2. Each plugin block appears in the "🧩 Plugins" category with a purple-accented border
3. Admins can **drag and drop** plugin blocks into the page canvas just like built-in blocks
4. In the editor, plugin blocks display a preview placeholder showing the block name, plugin name, and icon
5. The Settings Panel shows read-only plugin block info (plugin name, block name, description)
6. On the storefront, the `PluginBlockRenderer` fetches and renders the block's actual HTML content

Plugin blocks are visually distinct from built-in blocks (purple styling vs green) so admins can easily identify which blocks come from plugins.

---

## Custom API Routes

Add custom HTTP endpoints:

```typescript
routes: (router) => {
  router.get('/status', (c) => {
    return c.json({ status: 'ok' });
  });

  router.post('/webhook', async (c) => {
    const body = await c.req.json();
    // Handle webhook
    return c.json({ received: true });
  });
};
// Routes are mounted at: /api/v1/public/plugins/<plugin-slug>/
```

Plugin routes receive injected context via Hono's `c.get()`:

```typescript
routes: (router) => {
  router.get('/data', (c) => {
    const settings = c.get('pluginSettings'); // Resolved plugin settings
    const db = c.get('db'); // ScopedDatabase instance
    const logger = c.get('logger'); // Scoped logger
    return c.json({ ok: true });
  });
};
```

The plugin slug is auto-generated from the plugin name: `"FOMO Badges"` → `fomo-badges`.

---

## Admin Pages

Add custom pages to the admin panel with rendered content. Plugins can provide either **static HTML** via `content` or **dynamic HTML** via `apiRoute`.

### Static Content

Provide an HTML string directly. Scripts are extracted and executed after render (same trust model as storefront slots):

```typescript
adminPages: [
  {
    path: '/dashboard',
    label: 'My Dashboard',
    icon: 'chart-bar',
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
];
```

### Dynamic Content via API Route

Point to a route within your plugin's custom routes that returns `{ html: string }`:

```typescript
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
| `icon`     | `string` | ❌       | Icon name (for future use)                                            |
| `order`    | `number` | ❌       | Sort order in navigation (default: 10)                                |
| `parent`   | `string` | ❌       | Parent page path for nesting                                          |
| `content`  | `string` | ❌       | Static HTML content to render                                         |
| `apiRoute` | `string` | ❌       | Plugin route path that returns `{ html: string }` for dynamic content |

Admin pages automatically appear in the admin sidebar under a **Plugins** section when the plugin is active.

---

## CLI Commands

Add custom CLI commands:

```typescript
cli: [
  {
    name: 'sync',
    description: 'Sync products to marketplace',
    args: [{ name: 'sku', description: 'Product SKU', required: false }],
    options: [
      {
        name: 'force',
        alias: 'f',
        description: 'Force sync',
        type: 'boolean',
        default: false,
      },
    ],
    handler: async (args, ctx) => {
      ctx.logger.info('Syncing...', args);
    },
  },
];
// Run with: forkcart plugin run <plugin-name>:sync
```

---

## Scheduled Tasks

Run tasks on a schedule:

```typescript
scheduledTasks: [
  {
    name: 'daily-sync',
    schedule: '0 3 * * *', // 3 AM daily
    enabled: true,
    handler: async (ctx) => {
      await syncInventory(ctx);
    },
  },
];
```

Tasks are managed by the `PluginScheduler` and can be:

- Listed: `GET /api/v1/plugins/tasks`
- Manually triggered: `POST /api/v1/plugins/tasks/:taskKey/run`
- Enabled/disabled: `PUT /api/v1/plugins/tasks/:taskKey/toggle`

---

## Database Migrations

Add custom tables for your plugin:

```typescript
migrations: [
  {
    version: '1.0.0',
    description: 'Create analytics table',
    up: async (db, { ref }) => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS plugin_my_plugin_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id ${ref('products.id')} NOT NULL,
          customer_id ${ref('customers.id')},
          event_type TEXT NOT NULL,
          data JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    },
    down: async (db) => {
      await db.execute('DROP TABLE IF EXISTS plugin_my_plugin_events;');
    },
  },
];
```

### Type-Safe Column References with `ref()`

When your plugin tables reference core ForkCart tables, **always use `ref()`** to get the correct column type:

```typescript
import { ref, coreSchema } from '@forkcart/plugin-sdk';

// ref() returns the SQL type as a string
ref('products.id'); // → 'UUID'
ref('products.name'); // → 'VARCHAR(255)'
ref('products.price'); // → 'INTEGER'
ref('orders.id'); // → 'UUID'
ref('customers.email') // → 'VARCHAR(255)'
// Use in template literals for migrations:
`source_product_id ${ref('products.id')} NOT NULL`;
// expands to: "source_product_id UUID NOT NULL"
```

**Why this matters:** ForkCart uses UUID for all primary keys. If you use `VARCHAR(255)` instead, PostgreSQL will reject JOINs between your tables and core tables with `operator does not exist: uuid = character varying`. Using `ref()` prevents this entirely.

The `ref()` function provides full IDE autocomplete for all valid `table.column` paths.

#### Available Tables in `coreSchema`

| Table             | Primary Key | Common Columns                                         |
| ----------------- | ----------- | ------------------------------------------------------ |
| `products`        | `UUID`      | name, slug, sku, price, currency, category_id, status  |
| `variants`        | `UUID`      | product_id, sku, name, price, stock_quantity           |
| `orders`          | `UUID`      | order_number, status, customer_id, email, total_amount |
| `order_items`     | `UUID`      | order_id, product_id, variant_id, quantity, unit_price |
| `customers`       | `UUID`      | email, first_name, last_name, phone                    |
| `categories`      | `UUID`      | name, slug, parent_id, sort_order                      |
| `media`           | `UUID`      | filename, mime_type, url                               |
| `payments`        | `UUID`      | order_id, provider, status, amount                     |
| `product_images`  | `UUID`      | product_id, url, alt_text, sort_order                  |
| `product_reviews` | `UUID`      | product_id, customer_id, rating, title                 |

To inspect the full schema at runtime:

```typescript
import { coreSchema } from '@forkcart/plugin-sdk';

// Get all columns for a table
console.log(coreSchema.products);
// { id: { sqlType: 'UUID', nullable: false, primaryKey: true }, name: { sqlType: 'VARCHAR(255)', ... }, ... }
```

### How Migrations Work

1. Applied migrations are tracked in the `plugin_migrations` table
2. On plugin activation, `MigrationRunner.runPendingMigrations()` compares defined vs. applied migrations
3. Pending migrations run in version order (semver string comparison)
4. The `up` function receives two arguments: `db` (ScopedDatabase) and `helpers` (`{ ref, schema }`)
5. On plugin version update, new migrations are automatically run
6. A migration validator warns if you use VARCHAR for columns that reference UUID core tables

### `ScopedDatabase.execute()` in Migrations

The `execute()` method supports both Drizzle SQL template tags and raw SQL strings:

```typescript
// Drizzle sql tag (from drizzle-orm)
await db.execute(sql`CREATE TABLE IF NOT EXISTS ...`);

// Raw SQL string (no params)
await db.execute('CREATE TABLE IF NOT EXISTS plugin_my_plugin_data (id SERIAL PRIMARY KEY)');

// Raw SQL string with positional params ($1, $2, ...)
await db.execute('INSERT INTO plugin_my_plugin_data (name) VALUES ($1)', ['test']);
```

### ⚠️ Common Migration Mistakes

| ❌ Wrong                                | ✅ Right                                      | Why                                                     |
| --------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| `product_id VARCHAR(255)`               | `product_id ${ref('products.id')}`            | products.id is UUID, not VARCHAR                        |
| `JOIN products ON products.id = my_col` | `JOIN products ON products.id::text = my_col` | Type mismatch without cast (if you used VARCHAR)        |
| Hardcoding `UUID`                       | Using `ref('products.id')`                    | Future-proof — if we change the type, ref() updates too |

---

## Lifecycle Hooks

```typescript
onInstall: async (ctx) => {
  // First-time setup
  ctx.logger.info('Plugin installed!');
},

onUninstall: async (ctx) => {
  // Cleanup
},

onActivate: async (ctx) => {
  // Start background tasks, register resources
  // Called AFTER hooks, filters, slots, and migrations are registered
},

onDeactivate: async (ctx) => {
  // Stop background tasks
},

onUpdate: async (ctx, fromVersion) => {
  // Handle version migrations
  if (fromVersion < '2.0.0') {
    // Migrate old data
  }
},

// Called when an unhandled error occurs in a hook, route, or task.
// Great for error tracking (Sentry, etc.). Return true to suppress the error.
onError: async (error, source, ctx) => {
  ctx.logger.error(`Error in ${source.type}:${source.name}: ${error.message}`);
  // Sentry.captureException(error);
},

// Called on every server startup after activation.
// Use for cache warming, connection pools, health checks, etc.
onReady: async (ctx) => {
  ctx.logger.info('Plugin ready — warming caches...');
},
```

### Required Settings Validation

If a setting has `required: true`, the plugin **cannot be activated** until that setting is configured. The admin panel will show an error if required settings are missing.

### Activation Order

When a plugin is activated, the following happens in order:

1. Dependencies are validated (all required plugins must be installed and active)
2. **Required settings are validated** (missing required settings block activation)
3. Event hooks are registered on the EventBus
4. Filters are registered
5. Storefront slots are registered
6. CLI commands are registered
7. Scheduled tasks are registered
8. Custom routes are registered
9. **Pending migrations are run** (passing `db` + `{ ref, schema }` helpers)
10. **`onActivate` is called**
11. **`onReady` is called** (also on every server restart)
12. Provider bridges are registered (payment, email, marketplace, shipping)

---

## Plugin Context

Every handler receives a context object:

```typescript
interface PluginContext {
  /** Resolved settings values (secrets are decrypted) */
  settings: Record<string, unknown>;
  /** Scoped database — permission-aware proxy (see Security Model) */
  db: ScopedDatabase;
  /** Scoped logger (prefixed with plugin name) */
  logger: PluginLogger;
  /** Event bus for subscribing / emitting */
  eventBus: PluginEventBus;
}
```

The `db` field is a `ScopedDatabase` instance, **not** the raw Drizzle database handle. See [Security Model](#security-model) for details.

---

## Permissions

Declare what your plugin needs access to:

```typescript
permissions: [
  'orders:read',
  'orders:write',
  'products:read',
  'products:write',
  'customers:read',
  'customers:write',
  'settings:read',
  'settings:write',
  'email:send',
  'payments:process',
  'inventory:read',
  'inventory:write',
  'analytics:read',
  'files:read',
  'files:write',
  'webhooks:manage',
  'admin:full', // Grants unrestricted DB access — use sparingly!
];
```

### Permission → Table Mapping

Each permission grants access to specific database tables:

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

## Security Model

ForkCart's plugin system is designed with defense-in-depth. Understanding these security boundaries is important for both plugin authors and store administrators.

### ScopedDatabase

Plugins **never** receive the raw database handle. Instead, they get a `ScopedDatabase` proxy that enforces access control:

- **Plugin-owned tables** (`plugin_<name>_*`) are **always** accessible for read and write
- **Core tables** require matching permissions (e.g., `'orders:read'` to query orders)
- **`admin:full`** grants unrestricted access (avoid unless truly necessary)
- All queries are logged for audit purposes
- Unauthorized access throws an error and is logged as a warning

```typescript
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

**This is enforced by `ScopedDatabase`** — the proxy always allows access to tables matching your plugin's prefix, regardless of declared permissions.

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

### Secret Settings Encryption

Settings marked `secret: true` in the schema are encrypted with AES-256-GCM before database storage and decrypted transparently when passed to plugin handlers.

### Package Name Validation

The `installPlugin()` method validates package names against a strict regex to prevent command injection:

```
/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[a-zA-Z0-9._-]+)?$/
```

---

## Plugin Dependencies

Require other plugins to be installed:

```typescript
dependencies: ['stripe', 'mailgun'],
minVersion: '0.5.0', // Minimum ForkCart version
```

Dependencies are validated on activation. If any required plugin is missing or inactive, activation fails with a descriptive error listing all unmet dependencies.

---

## Health Check API

Get a detailed health report for any installed plugin. Useful for debugging activation issues, missing settings, or failed migrations.

### Endpoint

```
GET /api/v1/plugins/:id/health
```

### Response

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

**Fields:**

| Field          | Description                                                                     |
| -------------- | ------------------------------------------------------------------------------- |
| `healthy`      | `true` if migrations are applied, required settings are filled, and deps are OK |
| `migrations`   | Status of database migrations — `pending`, `applied`, or `failed`               |
| `settings`     | Whether all `required: true` settings have values                               |
| `routes`       | Whether the plugin's custom routes are registered                               |
| `dependencies` | Whether all declared dependencies are installed and active                      |
| `lastError`    | First detected issue, or `null` if healthy                                      |

There's also a bulk health check for all active plugins:

```
GET /api/v1/plugins/health
```

---

## Dev Mode & Hot Reload

During development, ForkCart can watch your plugin's directory and automatically reload it when files change.

### How It Works

1. `fs.watch` monitors the plugin directory recursively
2. On `.js`, `.ts`, `.json`, or `.mjs` file changes, a debounced reload triggers
3. The plugin is deactivated, its module is re-imported, and it's reactivated
4. All hooks, routes, filters, and slots are re-registered

**Hot reload is disabled in production** (`NODE_ENV === 'production'`).

### Programmatic API

```typescript
// Start watching (returns { watching: boolean, reason?: string })
pluginLoader.watchPlugin('my-plugin');

// Stop watching
pluginLoader.unwatchPlugin('my-plugin');

// Stop all watchers
pluginLoader.unwatchAll();
```

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

This deactivates the plugin, re-imports the module from disk, and reactivates it. Useful for CI/CD deployments or when you've manually updated plugin files.

---

## Conflict Detection

When multiple plugins are active, they may conflict by registering the same routes, claiming the same storefront slots, or using the same PageBuilder block names.

### Endpoint

```
GET /api/v1/plugins/conflicts
```

### Response

```json
{
  "data": [
    {
      "type": "route",
      "plugins": ["plugin-a", "plugin-b"],
      "detail": "Multiple plugins register route: GET /status"
    },
    {
      "type": "slot",
      "plugins": ["plugin-a", "plugin-c"],
      "detail": "Multiple plugins claim slot 'header-after' with order 10"
    }
  ],
  "hasConflicts": true
}
```

### Conflict Types

| Type    | Description                                                    |
| ------- | -------------------------------------------------------------- |
| `route` | Two plugins register the same HTTP method + path               |
| `hook`  | Two plugins hook and filter the same event                     |
| `slot`  | Two plugins claim the same storefront slot with the same order |
| `block` | Two plugins register a PageBuilder block with the same name    |

### Programmatic API

```typescript
const conflicts = pluginLoader.detectConflicts();
// Returns: Array<{ type: string, plugins: string[], detail: string }>
```

---

## Query Stats & Rate Limiting

The `ScopedDatabase` tracks query metrics per plugin and enforces rate limits to prevent runaway plugins from degrading performance.

### Rate Limiting

Each plugin is limited to **100 queries per second** by default. Exceeding this throws an error:

```
Plugin 'my-plugin' exceeded query rate limit (100/s)
```

The limit is configurable per `ScopedDatabase` instance (set via constructor).

### Slow Query Logging

Any query taking longer than **500ms** is logged as a warning:

```
WARN [scoped-database] Slow plugin query detected { pluginName: 'my-plugin', operation: 'execute', durationMs: 1234 }
```

### Query Statistics

Access stats from the plugin context's `db` instance:

```typescript
const stats = ctx.db.getStats();
// {
//   totalQueries: 42,
//   slowQueries: 1,
//   lastQueryAt: Date
// }
```

All operations are tracked: `execute`, `insert`, `update`, `delete`, and `select`.

---

## Provider Implementations

### Payment Provider

```typescript
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

```typescript
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

```typescript
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
      return {
        messageId: 'msg_xxx',
        accepted: true,
      };
    },
  },
});
```

### Shipping Provider

```typescript
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

## Full Example: Discount Codes Plugin

```typescript
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
      // Validate discount code
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

---

## Publishing

### To the ForkCart Plugin Marketplace

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

**Upload steps:**

1. Build your plugin: `pnpm build`
2. Create ZIP with all required files
3. Go to [ForkCart Developer Portal](https://developers.forkcart.com)
4. Upload your ZIP
5. Set pricing (free or paid — ForkCart takes 10%, you keep 90%)

### As npm Package

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

---

## Best Practices

1. **Use TypeScript** — Better DX and catches errors early
2. **Handle errors gracefully** — Don't crash the main app (hook/filter errors are caught automatically)
3. **Use the settings schema** — Don't hardcode configuration
4. **Mark secrets as `secret: true`** — They'll be encrypted at rest
5. **Document your plugin** — Include a README.md
6. **Test thoroughly** — Especially payment/order flows
7. **Version your migrations** — Never modify existing ones, add new versions
8. **Declare permissions** — Only request what you need
9. **Clean up on uninstall** — Remove data when plugin is removed
10. **Use `"type": "module"`** — Required for local plugin loading

### ⚠️ Naming Conventions (Important!)

**Database Tables:** Always prefix with `plugin_<your-plugin-name>_`

```typescript
// ✅ CORRECT — table name matches plugin name
name: 'fomo-badges',
// ...
migrations: [{
  up: async (db) => {
    await db.execute(`
      CREATE TABLE plugin_fomo_badges_stats (...)
    `);
  }
}]

// ❌ WRONG — table name doesn't match plugin name
name: 'fomo-badges',
// ...
migrations: [{
  up: async (db) => {
    await db.execute(`
      CREATE TABLE plugin_social_proof_stats (...)  // Wrong prefix!
    `);
  }
}]
```

**Why:** The `ScopedDatabase` proxy allows plugins to access their own tables (`plugin_<name>_*`) without needing extra permissions. Mismatched names = permission errors.

**Route API Endpoints:** Use your plugin name in the path:

```typescript
// Routes are auto-mounted at: /api/v1/public/plugins/<plugin-slug>/
routes: (router) => {
  router.get('/stats', ...);  // → /api/v1/public/plugins/fomo-badges/stats
}
```

---

## Troubleshooting

### Plugin Not Discovered

**Symptom:** `POST /api/v1/plugins/discover` doesn't find your plugin.

**Checklist:**

1. Is your plugin in one of the scanned directories? (`packages/plugins/`, `data/plugins/`, `plugins/`, or `node_modules/`)
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
  "exports": {
    ".": {
      "import": "./dist/index.js"
    }
  }
}
```

Also ensure your compiled output (`dist/`) uses ES module syntax (`export default`, not `module.exports`).

### "Invalid plugin definition — missing name/version/type"

**Symptom:** Plugin is found but not registered.

**Fix:** Your default export must include `name`, `version`, and `type`:

```typescript
export default definePlugin({
  name: 'my-plugin', // Required
  version: '1.0.0', // Required
  type: 'general', // Required
  description: '...',
  author: '...',
});
```

### Migration Fails

**Symptom:** `Migration X.X.X for plugin 'my-plugin' failed`

**Common causes:**

- Table name doesn't have the `plugin_<name>_` prefix
- SQL syntax error in the migration
- The `up()` function receives `db` (ScopedDatabase), not the full context — use `db.execute()` directly

### Permission Denied on Database Access

**Symptom:** `Plugin 'my-plugin' does not have permission to read/write table 'X'`

**Fix:** Add the required permission to your plugin definition:

```typescript
permissions: ['orders:read'], // Add the permission you need
```

Or if you need unrestricted access: `permissions: ['admin:full']` (use sparingly).

### Storefront Slot Content Not Showing

**Symptom:** Plugin is active but slot content doesn't appear.

**Checklist:**

1. Is the plugin active? (Check `GET /api/v1/plugins`)
2. Is the slot name correct? (Check the [Available Slots](#storefront-slots) table)
3. Does the slot have `pages` restrictions that don't match the current page?
4. Check the API directly: `GET /api/v1/public/plugins/slots/<slot-name>`
5. Storefront caches slot content for 60 seconds — wait or restart the dev server

### Plugin Settings Not Taking Effect

**Symptom:** Changed settings in admin don't affect plugin behavior.

**Explanation:** When settings are updated, the plugin is automatically deactivated and reactivated. If this process fails, the plugin may be running with stale settings. Check the API logs for errors during reactivation.

### Unmet Dependencies Error

**Symptom:** `Cannot activate plugin 'X': unmet dependencies. Missing plugins: Y, Z`

**Fix:** Install and activate the required plugins first, then retry activating your plugin.

---

## Need Help?

- [GitHub Issues](https://github.com/forkcart/forkcart/issues)
- [Discord Community](https://discord.gg/forkcart)
- [API Documentation](./API.md)
