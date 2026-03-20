# MARKETPLACE-FIXES.md — Plugin/Marketplace System Fixes

**Date:** 2026-03-20
**Author:** Biene 🐝 (Nyx Sub-Agent)
**Status:** ✅ All fixes implemented, `pnpm format:check` + `pnpm build` pass

---

## 🔴 KRITISCH

### 1. Marketplace Connection Settings Encryption

**File:** `packages/core/src/marketplace/service.ts`

**Problem:** API keys, secrets, and tokens in `marketplace_connections.settings` were stored in plaintext.

**Fix:** Applied the same `encryptSecret`/`decryptSecret` pattern from `utils/crypto.ts`:

- Added `SECRET_SETTING_KEYS` list — common key names that indicate secrets (apiKey, secretKey, accessToken, password, clientSecret, etc.)
- `encryptSettings()` — encrypts secret values before DB write
- `decryptSettings()` — decrypts secret values for internal use (provider connections)
- `maskSettings()` — replaces secrets with `••••••••` for API responses
- `getConnection()` / `getConnections()` now return masked settings
- `getConnectionDecrypted()` (private) used internally for provider.connect()
- `saveConnection()` / `updateConnection()` encrypt before storing
- `testConnection()`, `syncProducts()`, `importOrders()`, `syncInventory()` all use decrypted settings

### 2. Scoped Database for Plugins

**File:** `packages/core/src/plugins/scoped-database.ts` (NEW)

**Problem:** Plugins received the raw Drizzle DB handle, allowing unrestricted access to all tables.

**Fix:** Created `ScopedDatabase` proxy class:

- Maps `PluginPermission` to allowed tables (e.g., `orders:read` → `orders`, `order_items` tables)
- Plugin-owned tables (`plugin_<name>_*`) are always accessible
- `admin:full` grants unrestricted access
- Proxied methods: `query` (read), `insert`, `update`, `delete`, `select`, `execute`
- Logs blocked access attempts for audit
- Updated `PluginLoader.buildPluginContext()` to use `ScopedDatabase` instead of raw `db`

---

## 🟡 WICHTIG

### 3. Plugin Migration Runner

**File:** `packages/core/src/plugins/migration-runner.ts` (NEW)

**Problem:** Plugins define `migrations` in the SDK but no code executed them.

**Fix:** Implemented `MigrationRunner`:

- Creates `plugin_migrations` tracking table automatically
- `runPendingMigrations()` — compares defined migrations against applied ones, runs missing ones in version order
- `rollbackMigration()` — rolls back a specific migration
- Called during `activateSdkPlugin()` — migrations run before `onActivate`
- Also called during `handlePluginUpdate()` for version updates

### 4. Admin Pages Rendering

**Files:**

- `packages/api/src/routes/v1/plugins.ts` — new `GET /plugins/admin-pages` endpoint
- `packages/core/src/plugins/plugin-loader.ts` — new `getAllAdminPages()` method
- `packages/admin/src/app/plugins/[id]/[...page]/page.tsx` (NEW) — dynamic catch-all route
- `packages/admin/src/app/plugins/[id]/page.tsx` — added admin pages section with links

**Problem:** `adminPages` were defined in plugin definitions but never rendered.

**Fix:**

- Backend: `PluginLoader.getAllAdminPages()` collects admin pages from all active plugins
- API: `GET /api/v1/plugins/admin-pages` returns all plugin admin pages
- Frontend: Dynamic `[...page]` route renders plugin admin pages with sidebar navigation
- Plugin detail page shows clickable admin page cards when available

### 5. Custom Routes Mounting

**Files:**

- `packages/core/src/plugins/plugin-loader.ts` — route registrar storage + `getPluginRouteRegistrars()`
- `packages/api/src/routes/v1/plugins.ts` — new `mountPluginRoutes()` function
- `packages/api/src/app.ts` — calls `mountPluginRoutes(v1, pluginLoader)` after plugin loading

**Problem:** `routes` field was accepted in plugin definitions but never mounted.

**Fix:**

- Plugin `routes` callbacks are stored during activation in `pluginRouteRegistrars` map
- `mountPluginRoutes()` creates Hono sub-routers for each plugin, wraps handlers, and mounts them under `/api/v1/plugins/<pluginName>/`
- Routes are cleaned up on plugin deactivation

### 6. Dependency Resolution

**File:** `packages/core/src/plugins/plugin-loader.ts` — new `validateDependencies()` method

**Problem:** No validation that required plugins were installed/active before activation.

**Fix:**

- `validateDependencies()` checks all declared `dependencies` against the DB
- Throws descriptive error listing missing and inactive plugins
- Called at the start of `activatePlugin()` before any other work

### 7. Filter System Integration

**Status:** ✅ Already implemented in the codebase!

The analysis said filters weren't connected, but they actually ARE:

- `ProductService.applyProductFilters()` — applies `product:price`, `product:title`, `product:description`
- `CartService.formatCart()` — applies `cart:total`
- `SearchService.search()` — applies `search:query` and `search:results`
- `PaymentService.getActiveProviders()` — applies `checkout:payment-methods`

All services have `setPluginLoader()` for late injection and it's called in `app.ts`.

---

## 🟢 NICE TO HAVE

### 8. Plugin Health Check

**Files:**

- `packages/core/src/plugins/plugin-loader.ts` — `healthCheck()` method
- `packages/api/src/routes/v1/plugins.ts` — `GET /plugins/health` endpoint

Returns health status for all active plugins (hook/filter counts, active state). Returns 503 if any plugin is unhealthy.

### 9. onUpdate Version Tracking

**File:** `packages/core/src/plugins/plugin-loader.ts` — `handlePluginUpdate()` method

**Problem:** `onUpdate` lifecycle hook was never called when a plugin version changed.

**Fix:**

- `ensurePluginInDb()` now detects version changes and calls `handlePluginUpdate()`
- `handlePluginUpdate()` runs any new migrations, then calls `onUpdate(ctx, fromVersion)`
- Logs version transitions

---

## Files Changed

| File                                                     | Action                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `packages/core/src/plugins/scoped-database.ts`           | NEW                                                              |
| `packages/core/src/plugins/migration-runner.ts`          | NEW                                                              |
| `packages/core/src/plugins/index.ts`                     | MODIFIED (exports)                                               |
| `packages/core/src/plugins/plugin-loader.ts`             | MODIFIED (scoped DB, migrations, deps, routes, health, onUpdate) |
| `packages/core/src/marketplace/service.ts`               | MODIFIED (encryption)                                            |
| `packages/api/src/routes/v1/plugins.ts`                  | MODIFIED (admin-pages, health, mountPluginRoutes)                |
| `packages/api/src/app.ts`                                | MODIFIED (import + mount plugin routes)                          |
| `packages/admin/src/app/plugins/[id]/page.tsx`           | MODIFIED (admin pages section)                                   |
| `packages/admin/src/app/plugins/[id]/[...page]/page.tsx` | NEW (dynamic plugin page)                                        |

---

## Verification

```bash
pnpm format:check  # ✅ All matched files use Prettier code style!
pnpm build          # ✅ Tasks: 17 successful, 17 total
```
