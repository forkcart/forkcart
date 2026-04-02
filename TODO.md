# ForkCart TODO — Master List

_Gesammelt am 28./29. März 2026 beim Plugin System Sprint + Frische-Instanz-Test_
_Aktualisiert am 02. April 2026 — Audit gegen Codebase_

---

## 🔴 PRIORITY 0 — Plugin System Production Hardening (29.03.2026)

### Settings Cache Invalidation

- [ ] When plugin settings are saved in Admin, refresh `pluginSettingsCache` without restart
- [ ] Add `POST /api/v1/admin/plugins/:id/reload` endpoint that re-reads settings from DB
- [ ] After settings save in Admin UI → call reload endpoint automatically

### React Shims Completeness

- [ ] Add missing hooks: `useId`, `useSyncExternalStore`, `useTransition`, `useDeferredValue`, `useImperativeHandle`, `useLayoutEffect`, `useDebugValue`
- [ ] Add missing APIs: `createRef`, `isValidElement`, `startTransition`, `use`
- [ ] Document which React APIs are available in plugin components

### Plugin Deactivation → Route Cleanup

- [ ] When plugin is deactivated, unmount its API routes immediately (not just on restart)
- [ ] Remove storefront components from slot registry on deactivation
- [ ] Clear plugin scheduled tasks on deactivation

### Plugin Update Rollback

- [ ] Before updating: backup current plugin version to `data/plugins/.backup/<slug>/<version>/`
- [ ] If new version crashes on activation → auto-rollback to previous version
- [ ] Show rollback option in Admin UI

### Plugin Sandbox / Isolation

- [ ] Memory limit per plugin (track heap usage)
- [ ] CPU time tracking per plugin query
- [ ] Crash isolation: catch unhandled errors in plugin code without crashing server
- [ ] Rate limit per plugin API route (already partially done with query stats)

### Component Cache Busting

- [ ] `components.js` served with version hash in URL: `/components.js?v=<hash>`
- [ ] Or: `Cache-Control: no-cache` with ETag validation
- [ ] After plugin update → old cached component is replaced immediately

### Store Install Safety

- [ ] Before overwriting: check if local files were modified (hash comparison)
- [ ] Show warning: "Local changes will be lost" with diff
- [ ] Option to merge or skip

### Plugin Changelog in Admin

- [ ] Show version changelog in plugin detail page
- [ ] Fetch from Developer Portal API on update check

### Multi-Instance / Cluster Support

- [ ] Document shared storage requirement for `data/plugins/`
- [ ] Or: Plugin files in DB (BLOB) instead of filesystem
- [ ] Plugin install broadcasts to all instances

### storefrontComponents SSR

- [ ] Support `'use server'` components in plugins (for SEO-critical content)
- [ ] Or: SSR wrapper that pre-renders plugin HTML on server

---

## 🟠 PRIORITY 2 — Installer & Self-Hosting

### Web Installer (Setup Wizard)

**Problem:** Frische Installation braucht CLI-Kenntnisse, manuelle ENV-Konfiguration, DB-Setup.

**Ziel:** Browser-basierter Setup-Wizard wie WordPress/Shopware.

**Schritte:**

1. `packages/installer/` — Standalone Express/Hono App
2. Wizard Steps: DB-Connection → Admin-Account → Shop-Name/Währung → Demo-Daten? → Fertig!
3. Generiert `.env` Dateien automatisch
4. Erstellt Admin-User in DB
5. Startet alle Services
6. Redirect zu Admin-Login

### Installer-Bugs (gefunden beim Frisch-Test)

- [ ] `SESSION_SECRET` in `.env.example` dokumentieren + auto-generieren
- [ ] `API_CORS_ORIGIN` automatisch aus Domain ableiten
- [ ] Admin-User bei Erstinstallation anlegen (Setup-Wizard oder CLI Command)
- [ ] `DATABASE_URL` wird von `pnpm db:migrate` nicht aus `packages/api/.env` gelesen
- [ ] `pnpm db:seed` braucht auch `DATABASE_URL` als ENV

### GitHub Releases

- [ ] Aktuellen Stand als `v0.1.0` taggen
- [ ] CHANGELOG.md anlegen
- [ ] GitHub Release mit Download-ZIP erstellen
- [ ] Installer zieht Releases statt `main`

---

## 🟡 PRIORITY 3 — Plugin System Polish

### Plugin-to-Plugin Communication

- [ ] `ctx.plugins.call('other-plugin', 'method', args)` — synchroner RPC
- [ ] Oder: Shared Service Registry

### Plugin Webhook System

- [ ] `/api/v1/webhooks/<plugin-slug>` Auto-Route
- [ ] Signature Verification Helpers im SDK
- [ ] Webhook Secret Management im Admin

### Plugin Dependency Version Ranges

- [ ] `dependencies: { 'stripe': '^2.0.0' }` statt nur `['stripe']`
- [ ] Semver Range Matching bei Activation

### Dynamic Storefront Slots

- [ ] Themes/Plugins können eigene Slots registrieren
- [ ] `<StorefrontSlot slotName="custom-section" />` funktioniert ohne Hardcoding

### Plugin Theming API

- [ ] Plugins können Theme-Variablen nutzen (Farben, Fonts)
- [ ] `ctx.theme.primaryColor` statt hardcoded CSS

### Multi-Language für Plugin-Strings

- [ ] Plugin Labels/Descriptions in i18n integrieren
- [ ] `definePlugin({ i18n: { de: { name: 'Stripe Zahlungen' } } })`

### Plugin Analytics Dashboard

- [ ] Pro Plugin: Query Count, Response Times, Error Rate
- [ ] Visualisierung im Admin

---

## 🟢 PRIORITY 4 — DX & Quality

### Auto-Deploy Script

- [ ] `forkcart deploy` → git pull, pnpm install, pnpm build, systemctl restart
- [ ] Oder: Post-Push Webhook

### Plugin Store Verbesserungen

- [ ] Plugin Screenshots im Store
- [ ] Plugin Reviews & Ratings im Admin
- [ ] Plugin Revenue Dashboard für Entwickler

### Testing

- [ ] E2E Tests für Plugin-Installation + Activation
- [ ] E2E Tests für Checkout Flow mit Plugin-Payment
- [ ] Plugin SDK Test Utilities (`createTestContext()`)

### Documentation

- [ ] `docs/SELF-HOSTING.md` erweitern mit Docker + Installer
- [ ] Video-Tutorials für Plugin-Entwicklung
- [ ] API Reference auto-generieren aus Hono Routes

---

## 📝 PLUGIN DOCS GAPS (29.03.2026)

- [ ] Document Payment Provider: Redirect vs Embedded flow (when to use which)
- [ ] Document React Shims: which hooks/APIs are available in plugin components
- [ ] Document Webhook URL pattern for payment plugins
- [ ] Add Solana Pay as second reference plugin alongside Stripe in docs
- [ ] Document plugin settings cache behavior (changes require restart until #cache-refresh is fixed)

---

## ✅ DONE (28.03.2026)

- [x] Plugin SDK v2 (ref(), coreSchema, onReady, onError, minVersion)
- [x] Plugin Hot Reload + Dev CLI
- [x] Plugin Preview/Sandbox
- [x] Storefront Pages
- [x] CSS Isolation (scopePluginCss)
- [x] Settings Groups/Tabs
- [x] /ext/ Prefix optional
- [x] Dynamic Route Mounting
- [x] Block-Fetch Dedup
- [x] window.FORKCART alle Page Types
- [x] product_categories in coreSchema
- [x] contentRoute slug/path Passthrough für SSR
- [x] Admin API URL (window.\_\_FORKCART_API_URL)
- [x] PLUGINS.md Mega-Merge (~2500 Zeilen)
- [x] README überarbeitet
- [x] Repo Cleanup
- [x] 11 Bugs gefixt
- [x] Frische Instanz aufgesetzt + getestet

---

## ✅ DONE (29.03.2026 — Geburtstags-Sprint! 🎂)

- [x] Stripe extracted from core → Plugin in Store (v1.2.0)
- [x] Multi-Provider Checkout (Stripe + Solana Pay side by side)
- [x] storefrontComponents auto-compile on store install
- [x] storefrontComponents both Array + Object format support
- [x] Shared React for plugin components (ReactGlobals + shims)
- [x] ChunkLoadError auto-recovery (Admin + Storefront)
- [x] Rebuild banner after plugin install/update/delete
- [x] CSRF exempt for storefront endpoints
- [x] ensureServerCart() before create-intent
- [x] Payment Provider Bridge: initialize() with DB settings
- [x] Payment Provider Bridge: use provider's own ID from getClientConfig()
- [x] Plugin settings cache for route context
- [x] ScopedDatabase: undefined params → NULL
- [x] Checkout: redirect-based payment flow
- [x] Checkout: payment step with provider selection UI
- [x] Better Zod validation errors on create-intent
- [x] readOnly settings field support in Admin
- [x] Webhook URL info field in Stripe plugin
- [x] Shipping cost added to payment amount
- [x] Cent-bug fixed (prices already in cents, no double conversion)
- [x] Post-push checklist: .next cache + rebuild + restart

---

## ✅ DONE (02.04.2026 — Audit-Ergebnis)

_Items die bei Audit als bereits implementiert verifiziert wurden:_

- [x] **P1: Storefront Components (React in Plugins)** — PluginComponent.tsx, PluginComponentSlot.tsx, ReactGlobals.tsx, Dynamic Import via React.lazy
- [x] **P1: Stripe aus Core entfernen** — Kein Stripe in storefront/package.json, keine stripe-payment.tsx, generischer Multi-Provider Checkout
- [x] **P0: CSRF Middleware** — csrf.ts mit fc_csrf Cookie + x-csrf-token Header
- [x] **P0: Plugin Dependencies** — Validation in plugin-loader.ts (checkDependencies, findSdkDef)
- [x] **P2: create-forkcart CLI** — packages/create-forkcart mit interaktivem Setup (DB, Demo Data, Package Manager)
- [x] **P2: Docker Compose** — docker-compose.yml mit PostgreSQL, Health Checks, 127.0.0.1 Ports
- [x] **P4: CI/CD** — ci.yml in .github/workflows
- [x] **P4: Version-Upload Error Messages** — 409 statt 500
- [x] **P4: storefrontComponents Docs** — Both Array + Object syntax documented
- [x] **P4: readOnly settings Docs** — Documented
- [x] **P0: Plugin Reload** — Hot-reload bei Update + manual reload endpoint in plugins.ts

_Nyx 🦞 — 02.04.2026, 11:05 UTC_
