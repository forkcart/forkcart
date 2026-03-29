# ForkCart TODO — Master List

_Gesammelt am 28./29. März 2026 beim Plugin System Sprint + Frische-Instanz-Test_

---

## 🔴 PRIORITY 1 — Plugin React Components

### Storefront Components (React in Plugins)

**Problem:** Plugins können nur HTML+JS injizieren. Für Stripe Elements, komplexe UI-Widgets etc. braucht es React-Komponenten.

**Ziel:** Plugins liefern React-Komponenten die nativ im Storefront rendern.

**Plan:**

1. Plugin SDK: Neuer `storefrontComponents` Type
2. Plugin Build: esbuild erstellt ESM-Bundle mit React (externalized)
3. Storefront: Dynamic Import via `React.lazy(() => import(moduleUrl))`
4. API: Endpoint der Plugin-Bundles served
5. Stripe wird das erste Plugin das es nutzt

**Dateien:**

- `packages/plugin-sdk/src/types.ts` — `PluginStorefrontComponent` Interface
- `packages/core/src/plugins/plugin-loader.ts` — Component Registry
- `packages/api/src/routes/v1/plugins.ts` — Component Bundle Serving
- `packages/storefront/components/plugins/PluginComponent.tsx` — Dynamic Loader
- `packages/storefront/app/[locale]/checkout/page.tsx` — Stripe raus, generisch machen

### Stripe aus Core entfernen

**Problem:** `stripe-payment.tsx`, `@stripe/stripe-js`, `@stripe/react-stripe-js` sind im Storefront hardcoded. `registry.ts` hat Stripe-spezifischen Code.

**Ziel:** Stripe ist NUR ein Plugin. Core kennt kein Stripe.

**Schritte:**

1. `packages/storefront/components/checkout/stripe-payment.tsx` → ins Stripe Plugin verschieben
2. `@stripe/stripe-js` + `@stripe/react-stripe-js` aus Storefront `package.json` entfernen
3. `packages/core/src/payments/registry.ts` Zeile 62-64 → generische Webhook-Detection
4. Checkout Page: Generischer `<PluginPaymentComponent />` statt `<StripePayment />`
5. Stripe Plugin im Developer Portal updaten mit Frontend-Bundle

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

### Docker Compose (Production-Ready)

**Problem:** Kein funktionierender One-Command-Setup.

**Ziel:** `docker compose up` und alles läuft.

**Schritte:**

1. Multi-Stage Dockerfiles für API, Storefront, Admin
2. `docker-compose.yml` mit PostgreSQL, Caddy, allen Services
3. `DOMAIN=myshop.com docker compose up` → SSL, Routing, alles automatisch
4. Health Checks pro Container
5. Volume Mounts für `data/plugins/` und Uploads

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

### CI/CD

- [ ] GitHub Actions: Push → Build → Test → Deploy
- [ ] Auto-Restart nach Deploy
- [ ] Staging Environment

### Auto-Deploy Script

- [ ] `forkcart deploy` → git pull, pnpm install, pnpm build, systemctl restart
- [ ] Oder: Post-Push Webhook

### Plugin Store Verbesserungen

- [ ] Version-Upload: Bessere Error Messages (409 statt 500 → ✅ DONE)
- [ ] Plugin Screenshots im Store
- [ ] Plugin Reviews & Ratings im Admin
- [ ] Plugin Revenue Dashboard für Entwickler

### Testing

- [ ] E2E Tests für Plugin-Installation + Activation
- [ ] E2E Tests für Checkout Flow mit Plugin-Payment
- [ ] Plugin SDK Test Utilities (`createTestContext()`)

### Documentation

- [ ] `docs/SELF-HOSTING.md` erweitern mit Docker + Installer
- [ ] `docs/PLUGINS.md` — storefrontComponents Sektion (wenn gebaut)
- [ ] Video-Tutorials für Plugin-Entwicklung
- [ ] API Reference auto-generieren aus Hono Routes

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

_Nyx 🦞 — 29.03.2026, 00:05 UTC_
