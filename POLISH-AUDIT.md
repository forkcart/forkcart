# ForkCart Polish Audit 🐝

**Audit-Biene:** Subagent | **Datum:** 19. März 2026
**Scope:** Vollständiges Monorepo (~64k LoC, 12+ Packages)
**Build:** ✅ `pnpm build` — 17/17 Tasks erfolgreich (25.6s)
**Formatting:** ✅ `pnpm format:check` — All files pass
**Tests:** ⚠️ `pnpm test` — 19/19 Tasks pass, aber **0 echte Tests** (nur 1 Datei: `format-price.test.ts`)

---

## 🔴 Critical — Muss vor Launch gefixt werden

### C-01: Dockerfiles fehlen — docker-compose.yml kaputt

**Problem:** `docker-compose.yml` referenziert 3 Dockerfiles (`packages/api/Dockerfile`, `packages/admin/Dockerfile`, `packages/storefront/Dockerfile`) — **keines davon existiert.** `docker compose up` crasht sofort.
**Dateien:** `docker-compose.yml` (Zeilen 23, 35, 45)
**Aufwand:** Mittel (3 Dockerfiles schreiben, multi-stage node builds)

### C-02: CI nutzt Node 20, Projekt erfordert Node 22

**Problem:** `package.json` sagt `"engines": { "node": ">=22" }`, `.nvmrc` sagt `22`. Aber `.github/workflows/ci.yml` nutzt `node-version: 20` in allen 3 Jobs. CI testet mit falscher Node-Version.
**Datei:** `.github/workflows/ci.yml` (Zeilen 16, 41, 64)
**Aufwand:** Klein (3x `node-version: 20` → `node-version-file: .nvmrc`)

### C-03: Keine Tests

**Problem:** Es gibt exakt **1 Testdatei** im gesamten Projekt: `packages/shared/src/__tests__/format-price.test.ts` (3 triviale Tests). Null Tests für API-Routes, Core-Services, Auth, Payments, Checkout.
**Aufwand:** Groß (Tests für kritische Pfade: Auth, Payments, Cart, Orders)

### C-04: Password-Reset sendet Token nicht per Email

**Problem:** `forgotPassword()` generiert einen Reset-Token, speichert ihn in der DB, aber **sendet ihn nicht**. Kommentar sagt `// TODO: Send reset token via email instead of returning it`. Die API-Response gibt den Token zwar nicht zurück (gut), aber der User bekommt auch keinen Link.
**Datei:** `packages/core/src/customers/auth-service.ts` (Zeile 211)
**Aufwand:** Mittel (Email-Template + EmailService-Integration)

### C-05: DB-Migrations Nummerierung kaputt

**Problem:** Zwei Migrations haben die Nummer `0020_`: `0020_multi-currency.sql` UND `0020_product-variants.sql`. Außerdem enthält `meta/_journal.json` nur 9 Einträge, aber es gibt 28 Migration-Dateien. Migrations 0008–0023, 0025–0027 fehlen im Journal. Frische Instanzen werden diese Migrations **nicht ausführen**.
**Datei:** `packages/database/src/migrations/meta/_journal.json` + `0020_*.sql`
**Aufwand:** Mittel (Journal fixen, Duplikat-Nummer renumbern)

### C-06: Default-Credentials auf Login-Seite angezeigt

**Problem:** Die Admin Login-Page zeigt `Default: admin@forkcart.dev / admin123` als permanenten Hinweis. Das ist für Demo/Dev OK, muss aber für Production-Instanzen weg oder hinter einem ENV-Flag.
**Datei:** `packages/admin/src/app/login/page.tsx` (letzte Zeile vor `</div>`)
**Aufwand:** Klein (hinter `process.env.DEMO_MODE === 'true'` Flag)

### C-07: CompleteDemoPaymentSchema ohne `.strict()`

**Problem:** `CreatePaymentIntentSchema` hat `.strict()` (RVS-025 gegen Prototype Pollution), aber `CompleteDemoPaymentSchema` hat es **nicht**. Inkonsistente Sicherheitsmaßnahme.
**Datei:** `packages/api/src/routes/v1/payments.ts` (Zeilen 32–42)
**Aufwand:** Klein (`.strict()` hinzufügen)

### C-08: Kein CSRF-Schutz

**Problem:** Kein CSRF-Token-System. Admin-Panel und Customer-Auth nutzen Bearer-Tokens (weniger anfällig), aber session-basierte Cart-Operationen könnten betroffen sein.
**Aufwand:** Mittel (CSRF-Middleware für state-changing Endpoints)

---

## 🟡 Should Fix — Vor Production empfohlen

### S-01: API_URL in ~20 Dateien verstreut statt zentralisiert

**Problem:** `process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000'` wird in ~20 verschiedenen Storefront-Dateien definiert. Sollte 1x in einer `lib/config.ts` sein.
**Dateien:** `packages/storefront/app/[locale]/cart/page.tsx`, `checkout/page.tsx`, `account/*/page.tsx`, `components/chat/chat-widget.tsx`, `components/cart/cart-provider.tsx` u.v.m.
**Aufwand:** Klein (1x definieren, überall importieren)

### S-02: `any` Types in Storefront

**Problem:** `packages/storefront/app/[locale]/page.tsx` und `home-content.tsx` nutzen `any[]` für Products und Categories statt proper Typen. Ca. 6-8 Stellen in der Storefront.
**Dateien:**

- `packages/storefront/app/[locale]/page.tsx` (Zeilen 23-24)
- `packages/storefront/app/[locale]/home-content.tsx` (Zeilen 9-10, 44, 76)
  **Aufwand:** Klein (Typen aus @forkcart/shared importieren)

### S-03: `as any` Casts in API

**Problem:** Mobile-App Route castet Service zu `any` um auf private Properties zuzugreifen.
**Datei:** `packages/api/src/routes/v1/mobile-app.ts` (Zeilen 118-119)
**Aufwand:** Klein (Public getter auf Service-Klasse hinzufügen)

### S-04: Console.log Statements in Production-Code

**Problem:** 75 `console.log/warn/error` Statements im gesamten Projekt (außerhalb CLI). Einige sind sinnvoll (tagged logging wie `[exchange-rates]`), aber viele sollten den Logger nutzen.
**Dateien:** Hauptsächlich in:

- `packages/api/src/app.ts` (6 Stellen)
- `packages/api/src/lib/cache-invalidation.ts` (4 Stellen)
- `packages/admin/src/app/settings/cookies/page.tsx` (5 Stellen)
- `packages/admin/src/app/pages/[id]/page.tsx` (1 Stelle)
  **Aufwand:** Klein-Mittel (durch `createLogger()` ersetzen wo applicable)

### S-05: `images.remotePatterns` erlaubt ALLES

**Problem:** `next.config.ts` hat `remotePatterns: [{ protocol: 'https', hostname: '**' }]` — erlaubt jede HTTPS-URL als Bildquelle. Öffnet SSRF-Risiko über Next.js Image Optimization.
**Datei:** `packages/storefront/next.config.ts` (Zeile 7)
**Aufwand:** Klein (auf API-Domain + bekannte CDNs beschränken)

### S-06: Mobile App: Email-Feld fehlt im Checkout

**Problem:** `customerEmail: address.phone || 'guest@forkcart.app'` — nutzt Phone als Email-Fallback und fällt auf hardcoded Adresse zurück.
**Datei:** `packages/mobile/app/checkout.tsx` (Zeile 53)
**Aufwand:** Klein (Email-Feld zum Checkout-Formular hinzufügen)

### S-07: Mobile App Build Endpoints sind Placeholders

**Problem:** `POST /build` und `GET /download/:type` sind als "placeholder" markiert. Die Admin-UI zeigt "Coming Soon" für native Builds.
**Dateien:**

- `packages/api/src/routes/v1/mobile-app.ts` (Zeilen 135, 147)
- `packages/admin/src/app/mobile-app/page.tsx` (Zeile 617)
  **Aufwand:** Groß (Cloud Build Integration = eigenes Projekt)

### S-08: Marketplace Plugins sind Skeleton-Implementierungen

**Problem:** Amazon, eBay, Otto, Kaufland Plugins implementieren die Interfaces, aber sind noch nicht battle-tested. Fehlende echte API-Integration für Inventory Sync, Order Import etc.
**Dateien:** `packages/plugins/marketplace-*/src/provider.ts`
**Aufwand:** Groß (pro Marketplace 1-2 Wochen, API-Credentials nötig)

### S-09: Hardcoded Port in Mobile App Config

**Problem:** Default `apiUrl` berechnet Port 4000 fest: `${window.location.hostname}:4000`. Sollte das API-URL aus der Env nutzen.
**Datei:** `packages/admin/src/app/mobile-app/page.tsx` (Zeilen 57-60)
**Aufwand:** Klein

### S-10: AI Provider `null` in App-Setup

**Problem:** `aiProvider: null` mit TODO-Kommentar — AI-Features funktionieren nur wenn manuell konfiguriert.
**Datei:** `packages/api/src/app.ts` (Zeile 445)
**Aufwand:** Mittel (AI Provider Registry an createApp binden)

### S-11: Checkout-Seite ist 819 Zeilen

**Problem:** `packages/storefront/app/[locale]/checkout/page.tsx` ist eine einzige 819-Zeilen Datei. Schwer wartbar. Sollte in Komponenten aufgeteilt werden (AddressStep, ShippingStep, PaymentStep, SuccessStep).
**Aufwand:** Mittel (Refactoring, keine Funktionsänderung)

### S-12: Hero Block hat leeres `alt=""`

**Problem:** Background-Image im Hero-Block hat `alt=""`. Nicht kritisch (dekorative Bilder dürfen leeres alt haben), aber das Image ist oft der Haupt-Visueller-Inhalt.
**Datei:** `packages/storefront/components/page-builder/blocks/hero.tsx` (Zeile 55)
**Aufwand:** Klein (alt aus Block-Config nutzen: `alt={title || "Hero background"}`)

### S-13: Self-Hosting Docs sagen `master` Branch

**Problem:** `docs/self-hosting.md` sagt `git pull origin master`, aber der Haupt-Branch heißt wahrscheinlich `main`.
**Datei:** `docs/self-hosting.md` (Update-Sektion)
**Aufwand:** Klein

---

## 🟢 Nice to Have — Polish & DX Verbesserungen

### N-01: Duplicate Plugin Docs

**Problem:** Es gibt sowohl `docs/PLUGINS.md` als auch `docs/plugins.md` — identischer Name, verschiedene Groß/Kleinschreibung. Auf Case-Sensitive Dateisystemen sind das 2 Dateien.
**Aufwand:** Klein (eins löschen)

### N-02: Unused Markdown Docs im Root

**Problem:** `PAGE_BUILDER_SPEC.md`, `PAGE_BUILDER_AUDIT.md`, `DEEP-ANALYSIS.md`, `CONCEPT.md`, `FEATURES.md` — interne Analyse/Spec-Docs die vermutlich nicht in den Public Repo gehören.
**Aufwand:** Klein (nach `docs/internal/` verschieben oder `.gitignore`)

### N-03: Seed-Daten mit hardcoded `admin123`

**Problem:** Seed-Script nutzt `admin123` als Passwort. Ist für Dev OK, aber sollte klar als "DEVELOPMENT ONLY" markiert sein.
**Datei:** `packages/database/src/seeds/seed.ts` (Zeile 29)
**Aufwand:** Klein (Kommentar + README-Hinweis)

### N-04: Kein ESLint konfiguriert

**Problem:** `lint-staged` referenziert `eslint --fix`, aber kein `.eslintrc` oder `eslint.config.js` existiert im Root oder in Packages. `pnpm lint` ist zwar in turbo.json definiert, aber kein Package hat ein lint-Script.
**Aufwand:** Mittel (ESLint flat config + Regeln für alle Packages)

### N-05: Turbo Remote Caching nicht konfiguriert

**Problem:** Nur lokaler Cache, kein Remote Caching für CI. Builds auf CI starten immer von 0.
**Aufwand:** Klein-Mittel (Vercel Remote Cache oder custom)

### N-06: `.env` committed ins Repository

**Problem:** `.env` (mit echtem SESSION_SECRET und Prod-URLs) ist im Git. `.gitignore` listet `.env` nicht (nur `node_modules`, `dist`, `.next`, `.turbo`).
**Datei:** `.gitignore`
**Aufwand:** Klein (`.env` zu `.gitignore`, aus Git-History entfernen, Secret rotieren)

### N-07: `uploads/` Ordner im Repo

**Problem:** Leerer `uploads/` Ordner ist committed. Sollte in `.gitignore` sein mit einem `.gitkeep`.
**Aufwand:** Klein

### N-08: Discord-Link in Docs geht ins Leere

**Problem:** Self-Hosting Docs verweisen auf `https://discord.gg/forkcart` — existiert dieser Server?
**Datei:** `docs/self-hosting.md` (letzte Zeile)
**Aufwand:** Klein (Server erstellen oder Link entfernen)

### N-09: CONTRIBUTING.md referenziert fehlenden Lint-Befehl

**Problem:** Falls CONTRIBUTING.md `pnpm lint` empfiehlt, aber kein Lint-Script existiert → verwirrend für Contributors.
**Datei:** `CONTRIBUTING.md`
**Aufwand:** Klein

### N-10: `forkcart_session_id` in localStorage ist kein sicherer Session-Identifier

**Problem:** Chat-Widget generiert Session-IDs mit `crypto.randomUUID()` und speichert sie in localStorage. Ist OK für Chat-Sessions, aber der Variablenname suggeriert mehr Security als vorhanden.
**Datei:** `packages/storefront/components/chat/chat-widget.tsx` (Zeile 32)
**Aufwand:** Klein (Umbenennen zu `forkcart_chat_session_id`)

### N-11: `ARCHITECTURE.md` und `CONCEPT.md` könnten veraltet sein

**Problem:** Diese Docs stammen von vor dem Security-Audit und beschreiben möglicherweise nicht den aktuellen Stand.
**Aufwand:** Klein (Review + Update)

### N-12: Marketplace-Bilder werden nicht geladen

**Problem:** `images: [], // TODO: load product images` in MarketplaceService.
**Datei:** `packages/core/src/marketplace/service.ts` (Zeile 153)
**Aufwand:** Klein

---

## Zusammenfassung

| Priorität       | Anzahl | Aufwand gesamt               |
| --------------- | ------ | ---------------------------- |
| 🔴 Critical     | 8      | 3× Klein, 4× Mittel, 1× Groß |
| 🟡 Should Fix   | 13     | 6× Klein, 4× Mittel, 3× Groß |
| 🟢 Nice to Have | 12     | 10× Klein, 2× Mittel         |

### Top 5 Prioritäten für "Production Ready"

1. **C-05: DB Migrations Journal fixen** — Frische Instanzen sind kaputt
2. **C-01: Dockerfiles erstellen** — docker-compose ist broken
3. **C-02: CI Node-Version fixen** — Falscher Test-Target
4. **C-03: Tests schreiben** — Mindestens Auth, Payments, Cart
5. **C-04: Password-Reset Email** — Feature ist halbfertig

### Was gut ist ✅

- Build ist clean, keine TypeScript-Fehler
- Prettier-Formatting ist konsistent
- Zod-Validierung an API-Endpoints
- Rate Limiting implementiert (RVS-016)
- Security-Audit wurde durchgeführt (RVS-001 bis RVS-031)
- Session-Secret-Validation gegen bekannte Defaults
- Encryption für Plugin-Secrets (AES-256-GCM)
- i18n mit vollständigen en/de Übersetzungen (352/350 Keys)
- Solide Self-Hosting Docs
- Clean Monorepo-Architektur mit Turborepo

---

_Audit durchgeführt am 19. März 2026 von der Audit-Biene 🐝_
