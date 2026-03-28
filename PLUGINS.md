# ForkCart Plugin Developer Guide

Everything you need to build, ship, and maintain ForkCart plugins.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Plugin Structure](#plugin-structure)
- [definePlugin() API](#defineplugin-api)
- [Settings](#settings)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Event Hooks & Filters](#event-hooks--filters)
- [Custom API Routes](#custom-api-routes)
- [Admin Pages](#admin-pages)
- [Storefront Integration](#storefront-integration)
- [window.FORKCART Context](#windowforkcart-context)
- [PageBuilder Blocks](#pagebuilder-blocks)
- [Database Migrations](#database-migrations)
- [Scheduled Tasks](#scheduled-tasks)
- [CLI Commands](#cli-commands)
- [Permissions](#permissions)
- [Plugin Store](#plugin-store)
- [Health Checks & Conflict Detection](#health-checks--conflict-detection)
- [Plugin Dev CLI](#plugin-dev-cli)
- [Plugin Preview & Sandbox](#plugin-preview--sandbox)
- [Hot Reload (Dev Mode)](#hot-reload-dev-mode)
- [Gotchas & Common Mistakes](#gotchas--common-mistakes)

---

## Quick Start

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

  onActivate: async (ctx) => {
    ctx.logger.info('Hello from my-widget!');
  },
});
```

Build, copy to `data/plugins/my-widget/`, and activate from the admin panel.

---

## Plugin Structure

Plugins live in **one place**: `data/plugins/<slug>/`. This is the only path the loader scans.

```
data/plugins/my-widget/
├── forkcart-plugin.json    # Optional manifest (slug, display name, category)
├── package.json            # Must have "forkcart-plugin" keyword or name starting with "forkcart-plugin-"
├── src/
│   └── index.ts            # Source (auto-compiled on install from Plugin Store)
├── dist/
│   └── index.js            # Entry point (package.json "main" field)
└── tsconfig.json
```

### package.json requirements

```json
{
  "name": "forkcart-plugin-my-widget",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "keywords": ["forkcart-plugin"],
  "peerDependencies": {
    "@forkcart/plugin-sdk": "^0.1.0"
  }
}
```

The loader identifies ForkCart plugins by:

1. `keywords` array containing `"forkcart-plugin"`, OR
2. Package name starting with `forkcart-plugin-` or `@forkcart/plugin-`

### forkcart-plugin.json (optional manifest)

```json
{
  "slug": "my-widget",
  "name": "My Widget",
  "packageName": "forkcart-plugin-my-widget",
  "version": "1.0.0",
  "type": "general",
  "author": "You",
  "category": "Marketing"
}
```

The `slug` in this manifest is used for DB lookups and URL routing. If absent, the loader derives it from the plugin name.

---

## definePlugin() API

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

## Settings

Settings are declared as a typed schema. The admin panel auto-generates a form from this schema.

```ts
settings: {
  apiKey: {
    type: 'string',
    label: 'API Key',
    required: true,
    secret: true,           // Encrypted at rest, shown as •••••••• in admin
    placeholder: 'sk_...',
    description: 'Your payment gateway API key',
  },
  maxItems: {
    type: 'number',
    label: 'Max Items',
    default: 10,
    min: 1,
    max: 100,
  },
  enabled: {
    type: 'boolean',
    label: 'Enable Widget',
    default: true,
  },
  theme: {
    type: 'select',
    label: 'Theme',
    options: ['light', 'dark', 'auto'],
    default: 'auto',
  },
},
```

**Setting types:** `string`, `number`, `boolean`, `select`.

Settings are available in every lifecycle hook and route handler via `ctx.settings`. Secret settings are automatically encrypted before storage and decrypted before passing to your plugin — you never deal with encryption yourself.

**Required settings validation:** If a setting has `required: true`, the plugin cannot be activated until that setting is filled in. The loader checks this before calling `onActivate`.

---

## Lifecycle Hooks

All lifecycle hooks receive a `PluginContext` object:

```ts
interface PluginContext {
  settings: ResolvedSettings; // Your typed settings values
  db: ScopedDatabase; // Permission-scoped database access
  logger: PluginLogger; // Scoped logger (debug/info/warn/error)
  eventBus: PluginEventBus; // Subscribe to / emit events
}
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

### onReady

Use `onReady` for warmup work: cache priming, external service health checks, etc. It runs on every API server startup for active plugins — not just the first activation.

### onError

```ts
onError: async (error, source, ctx) => {
  // source = { type: 'hook' | 'route' | 'task' | 'filter', name: string }
  ctx.logger.error(`Error in ${source.type}:${source.name}: ${error.message}`);

  // Return true to suppress the error (prevent it from propagating)
  // Return void/false to let it propagate normally
},
```

---

## Event Hooks & Filters

### Hooks

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

**Available events:** `order:created`, `order:paid`, `order:shipped`, `order:cancelled`, `order:refunded`, `product:created`, `product:updated`, `product:deleted`, `cart:created`, `cart:updated`, `cart:item-added`, `cart:item-removed`, `customer:registered`, `customer:updated`, `checkout:started`, `checkout:completed`, `inventory:updated`, `inventory:low`, `plugin:activated`, `plugin:deactivated`.

### Filters

Transform data as it flows through the system (like WordPress `apply_filters`):

```ts
filters: {
  'product:price': async (price, ctx) => {
    // Apply a discount
    return Math.round(price * 0.9);
  },
  'cart:total': async (total, ctx) => {
    // Add a surcharge
    return total + 500; // +5.00 in cents
  },
},
```

**Available filters:** `product:price`, `product:title`, `product:description`, `cart:total`, `cart:shipping`, `cart:tax`, `checkout:payment-methods`, `checkout:shipping-methods`, `order:confirmation-email`, `search:results`, `search:query`, `admin:menu`, `storefront:head`, `storefront:footer`.

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

The `router` is a Hono-compatible interface with `get`, `post`, `put`, `delete`, and `patch` methods. Plugin context (db, settings, logger) is automatically injected into every request.

**Important:** The plugin slug in the URL is derived from `name` — kebab-cased, lowercased, non-alphanumeric chars replaced with hyphens. So `"FOMO Badges"` becomes `/plugins/fomo-badges/`.

---

## Admin Pages

Plugins can add pages to the admin panel. Two content strategies:

### Strategy 1: Static HTML content

```ts
adminPages: [
  {
    path: '/settings',
    label: 'My Settings',
    icon: 'settings',
    order: 10,
    content: '<div><h2>Plugin Settings</h2><p>Configure me!</p></div>',
  },
];
```

### Strategy 2: Dynamic content via apiRoute

```ts
adminPages: [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'bar-chart',
    order: 10,
    apiRoute: '/admin/dashboard', // Calls your plugin route
  },
];
```

When `apiRoute` is set, the admin fetches `GET /api/v1/public/plugins/<slug>/admin/dashboard` and expects `{ html: "<div>...</div>" }` in the response. This lets you render dynamic data (stats, charts, tables) server-side.

You define the route in your `routes` function — the admin page system calls it internally.

---

## Storefront Integration

### StorefrontSlot

Inject HTML into predefined storefront positions:

```ts
storefrontSlots: [
  {
    slot: "product-page-bottom",
    content: '<div class="my-widget">Hello from the product page!</div>',
    order: 10, // Lower = earlier
    pages: ["/product/*"], // Optional page filter
  },
],
```

**Available slots:** `head`, `body-start`, `body-end`, `header-before`, `header-after`, `footer-before`, `footer-after`, `product-page-top`, `product-page-bottom`, `product-page-sidebar`, `cart-page-top`, `cart-page-bottom`, `checkout-before-payment`, `checkout-after-payment`, `category-page-top`, `category-page-bottom`.

### How StorefrontSlot renders

`StorefrontSlot` is a **React Server Component** that:

1. Fetches slot content from `/api/v1/public/plugins/slots/<slotName>`
2. Sanitizes HTML through a liberal allowlist (scripts, styles, iframes, forms, SVG are all allowed)
3. Renders HTML via `dangerouslySetInnerHTML`
4. Extracts `<script>` tags and executes them via `ScriptExecutor`

### ScriptExecutor — Why this exists

**This is critical to understand.** Regular `<script>` tags inside `dangerouslySetInnerHTML` do NOT execute in React. Worse: when content is inside a React Suspense boundary (which Next.js uses heavily), even injected scripts in the hidden DOM won't run.

`ScriptExecutor` is a client component that:

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
- ⚠️ External script `src` attributes won't be loaded (use inline code that creates script elements dynamically if you need external scripts)

### PluginBlockFallback

For PageBuilder blocks that haven't been manually placed by the admin, `PluginBlockFallback` renders them at their `defaultSlot` position. Same script handling as `StorefrontSlot`.

---

## window.FORKCART Context

Every storefront page sets `window.FORKCART` with page-specific data that your plugin scripts can read. This is the primary way to get context about the current page without parsing URLs yourself.

The root layout always provides:

```ts
window.FORKCART.apiUrl; // Base API URL (e.g. "http://localhost:3000")
```

### Properties per page type

| Page     | `pageType`   | Additional properties                            |
| -------- | ------------ | ------------------------------------------------ |
| Product  | `"product"`  | `productId` (UUID), `productSlug`                |
| Category | `"category"` | `categorySlug`, `categoryId` (UUID, if resolved) |
| Cart     | `"cart"`     | —                                                |
| Checkout | `"checkout"` | —                                                |
| Search   | `"search"`   | `query` (the search string, if present)          |
| Account  | `"account"`  | —                                                |

### Usage in plugin scripts

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

---

## PageBuilder Blocks

Register blocks for the Craft.js-based PageBuilder:

```ts
pageBuilderBlocks: [
  {
    name: "my-banner",
    label: "My Banner",
    icon: "🎨",
    category: "Marketing",
    description: "A promotional banner widget",
    content: "<div>Banner HTML + <script>...</script></div>",
    defaultSlot: "product-page-bottom", // Falls back here if not placed
    defaultOrder: 10,
    pages: ["/product/*"], // Only on product pages
    settings: {
      /* block-specific settings */
    },
  },
],
```

Blocks with a `defaultSlot` appear automatically on matching pages even if the admin hasn't placed them in the PageBuilder template. Once placed manually, the fallback is suppressed.

### Block Fetch Deduplication

When multiple `PluginBlock` components render concurrently (common with several blocks on one page), the storefront deduplicates the API call. Only **one** request to `/api/v1/public/plugins/blocks` is made — all concurrent renders share the same in-flight promise. Results are cached in memory for 5 minutes and also leverage the Next.js fetch cache (`revalidate: 300`). You don't need to do anything special — this is automatic.

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

### Migration Helpers: `ref()` and `schema`

The second argument to `up()` provides two helpers:

- **`ref(path)`** — Returns the SQL type for a core table column. `ref('products.id')` returns `'UUID'`, `ref('products.name')` returns `'VARCHAR(255)'`. This prevents you from guessing column types and keeps your migrations aligned with core schema changes.

- **`schema`** — The full `coreSchema` object for introspection. Contains every core table and column with their SQL types, nullability, and primary key status.

```ts
// In your migration:
up: async (db, { ref, schema }) => {
  // ref() for inline SQL type references
  const productIdType = ref('products.id'); // 'UUID'

  // schema for programmatic introspection
  const orderCols = Object.keys(schema.orders); // ['id', 'order_number', 'status', ...]
};
```

### Core Schema Reference: `product_categories`

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

**Always provide a `down()` function** for rollback support, even if it's just `DROP TABLE`.

Migrations run automatically on plugin activation and version updates. Applied versions are tracked in the `plugin_migrations` table.

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

Tasks can be enabled/disabled and manually triggered from the admin panel via:

- `PUT /api/v1/plugins/tasks/:taskKey/toggle` — Enable/disable
- `POST /api/v1/plugins/tasks/:taskKey/run` — Manual trigger

---

## CLI Commands

Register commands accessible via the ForkCart CLI:

```ts
cli: [
  {
    name: "stats",
    description: "Show widget statistics",
    args: [{ name: "period", description: "Time period", required: false }],
    options: [
      {
        name: "format",
        alias: "f",
        description: "Output format",
        type: "string",
        default: "table",
      },
    ],
    handler: async (args, ctx) => {
      const count = await ctx.db.execute(
        "SELECT COUNT(*) as c FROM plugin_my_widget_logs",
      );
      ctx.logger.info(`Total logs: ${count.rows?.[0]?.c}`);
    },
  },
],
```

---

## Permissions

Declare what your plugin needs access to:

```ts
permissions: ['products:read', 'orders:read', 'customers:read'];
```

**Available permissions:**

| Permission         | Grants access to                    |
| ------------------ | ----------------------------------- |
| `orders:read`      | Read orders, order_items            |
| `orders:write`     | Write orders, order_items           |
| `products:read`    | Read products, variants, images     |
| `products:write`   | Write products, variants, images    |
| `customers:read`   | Read customers                      |
| `customers:write`  | Write customers                     |
| `settings:read`    | Read settings, theme_settings       |
| `settings:write`   | Write settings, theme_settings      |
| `inventory:read`   | Read products, variants (stock)     |
| `inventory:write`  | Write products, variants (stock)    |
| `analytics:read`   | Read search_logs, click_logs        |
| `files:read`       | Read media                          |
| `files:write`      | Write media                         |
| `email:send`       | Write email_logs                    |
| `payments:process` | Write payments, orders, order_items |
| `webhooks:manage`  | Write webhooks                      |
| `admin:full`       | Unrestricted access to everything   |

The `ScopedDatabase` enforces these at runtime — attempts to access tables outside your permissions throw an error. Plugin-owned tables (`plugin_<name>_*`) are always accessible regardless of permissions.

The scoped database also enforces a **rate limit** (default 100 queries/second) and logs slow queries (>500ms).

---

## Plugin Store

### Publishing

1. Submit via `POST /api/v1/store/submit` with plugin metadata
2. Publish versions via `PUT /api/v1/store/:slug/versions`
3. If a central registry is configured (`PLUGIN_REGISTRY_URL`), listings are synced

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

## Health Checks & Conflict Detection

### Health Checks

```
GET /api/v1/plugins/health          — All active plugins
GET /api/v1/plugins/:id/health      — Detailed report for one plugin
```

The detailed report includes:

- Migration status (applied/pending/failed)
- Settings validation (missing required values)
- Route registration status
- Dependency satisfaction
- Hook and filter counts
- Last error

### Conflict Detection

```
GET /api/v1/plugins/conflicts
```

Detects:

- **Route conflicts** — Multiple plugins registering the same HTTP path
- **Hook conflicts** — Multiple plugins filtering the same event
- **Slot conflicts** — Multiple plugins claiming the same slot with identical order
- **Block conflicts** — Multiple plugins registering a PageBuilder block with the same name

---

## Plugin Dev CLI

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

### Opening the Preview

In the admin **Plugins** list, click the preview (👁) button on any plugin. The modal opens as a full-screen overlay.

### The 3 Tabs

| Tab                    | Shows                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Storefront Slots**   | Every slot the plugin injects content into (e.g. `product-page-bottom`). Click a slot to expand and preview its rendered HTML.  |
| **PageBuilder Blocks** | All blocks the plugin provides for the drag-and-drop PageBuilder, with their icon, description, default slot, and page filters. |
| **Admin Widgets**      | Custom admin pages registered by the plugin. Click a page to load and preview its content inline.                               |

Each tab shows a count badge so you can see at a glance what a plugin contributes.

### Viewport Switcher

The top-right corner has a **Desktop / Tablet / Mobile** toggle (Monitor, Tablet, Smartphone icons). Switching viewport resizes the preview content area to `100%`, `768px`, or `375px` width — useful for checking how plugin output looks on different screen sizes.

### Inactive Plugins

If the plugin is inactive, the preview shows a warning instead of content. Inactive plugins don't register their slots, blocks, or admin pages, so there's nothing to preview — activate first.

---

## Hot Reload (Dev Mode)

In development (`NODE_ENV !== 'production'`), the loader can watch plugin directories for changes and auto-reload:

```
POST /api/v1/plugins/:id/reload     — Manual reload
```

The reload process:

1. Deactivates the plugin (unregisters hooks, routes, etc.)
2. Removes the old definition from memory
3. Re-imports the module with a cache-busting timestamp
4. Re-activates if it was active before

File watching uses `fs.watch` with recursive mode and 300ms debounce.

---

## Gotchas & Common Mistakes

### 1. The `dist/` stale problem

If you edit `src/index.ts` but forget to rebuild, the loader imports the old `dist/index.js`. Always rebuild before testing. The Plugin Store auto-compiles with esbuild, but local development requires you to run your own build step.

### 2. Display Name vs Technical Name

The DB stores the **display name** (e.g., "Nyx Recommendations") from the first registration. The SDK uses the **technical name** (e.g., "nyx-recommendations") from `definePlugin({ name: ... })`. The loader tries both when looking up plugins, plus the `slug` from `forkcart-plugin.json`. But if they diverge badly, things can break.

**Rule of thumb:** Keep `name` in `definePlugin()` as a kebab-case slug. Use `forkcart-plugin.json` for the pretty display name.

### 3. ZIP nested directory problem

When extracting plugin ZIPs, the contents often end up nested: `data/plugins/my-widget/my-widget/` or `data/plugins/my-widget/forkcart-plugin-my-widget/`. The loader handles this by checking multiple paths:

- `data/plugins/<slug>/`
- `data/plugins/<slug>/forkcart-plugin-<slug>/`
- `data/plugins/<slug>/<slug>/`

But deeply nested or unusually structured ZIPs can still cause "plugin code not found" errors.

### 4. Scripts in Suspense boundaries don't execute

As explained in [Storefront Integration](#storefront-integration), never rely on raw `<script>` tags in plugin HTML content. They **will not run** inside React Suspense boundaries. Use the `ScriptExecutor` pattern — ForkCart handles this automatically for `storefrontSlots` and `pageBuilderBlocks` content.

### 5. Plugin table naming

Custom tables **must** use the `plugin_<name>_` prefix. The `ScopedDatabase` proxy blocks access to unprefixed tables unless you have the matching permission. Replace non-alphanumeric chars in the plugin name with underscores for the prefix.

### 6. Settings re-initialization on change

When plugin settings are updated via the admin panel, the plugin is **deactivated and re-activated**. This means `onDeactivate` + `onActivate` fire, and all hooks/routes are re-registered. Design your plugin to handle this gracefully.

### 7. Secret settings and the admin API

Settings marked `secret: true` are stored encrypted and returned as `"••••••••"` in the admin API response. When the admin saves settings, the loader only encrypts values that aren't already encrypted — so round-tripping the masked value won't corrupt the actual secret.

### 8. `onReady` vs `onActivate`

`onActivate` runs when the plugin is toggled on. `onReady` runs on **every server startup** for already-active plugins. Use `onReady` for anything that needs to happen after a server restart (cache warmup, health checks, connection pools).

---

## Complete Example

See [`data/plugins/nyx-recommendations/`](./packages/api/data/plugins/nyx-recommendations/) for a full real-world plugin demonstrating:

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

_Built with 🦞 by the ForkCart team._
