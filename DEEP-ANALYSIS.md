# ForkCart — Deep Architecture & Code Analysis

**Analystin:** Senior E-Commerce Architektin
**Datum:** 18. März 2026
**Scope:** Vollständige Analyse aller 12+ Packages, ~64.000 LoC TypeScript
**Methode:** Zeile für Zeile, jede Datei, jedes Schema, jede Route

---

## TL;DR

ForkCart ist **beeindruckend gut** für ein Projekt dieser Größe und dieses Alters. Die Architektur ist clean, die Separation of Concerns stimmt, das Plugin-System ist durchdacht, und die Feature-Abdeckung ist für ein junges Open-Source-Projekt außergewöhnlich breit. Es gibt echte Differenzierungsmerkmale (AI-native, Marketplace-Plugins, Page Builder, Mobile App Generator).

**Aber:** Es gibt Schwächen in der Tiefe. Einige Features sind "breit aber nicht tief" — die Marketplace-Plugins sind Skeleton-Implementierungen, Tests fehlen komplett, und einige Performance-Patterns werden bei Skalierung brechen. Production-Readiness ist nahe, aber noch nicht da.

**Gesamtnote: 7.5/10** — Sehr solide Basis, braucht Polishing für Production.

---

## Inhaltsverzeichnis

1. [Monorepo & Infrastruktur](#1-monorepo--infrastruktur)
2. [packages/database — Drizzle Schemas](#2-packagesdatabase)
3. [packages/shared — Types & Validation](#3-packagesshared)
4. [packages/core — Business Logic](#4-packagescore)
5. [packages/api — Hono REST API](#5-packagesapi)
6. [packages/admin — Next.js Admin Panel](#6-packagesadmin)
7. [packages/storefront — Next.js Storefront](#7-packagesstorefront)
8. [packages/ai — AI Provider Registry](#8-packagesai)
9. [packages/i18n — Internationalization](#9-packagesi18n)
10. [packages/plugin-sdk — Plugin Interfaces](#10-packagesplugin-sdk)
11. [packages/plugins/\* — Plugin Implementierungen](#11-packagesplugins)
12. [packages/mobile — React Native App](#12-packagesmobile)
13. [packages/cli — CLI Tool](#13-packagescli)
14. [Systemweite Analyse](#14-systemweite-analyse)
15. [Verbesserungsvorschläge](#15-verbesserungsvorschläge)
16. [Marktvergleich](#16-marktvergleich)

---

## 1. Monorepo & Infrastruktur

### Struktur

```
forkcart/
├── packages/           # 12+ Packages
├── package.json        # Root config
├── pnpm-workspace.yaml # Workspace definition
├── turbo.json          # Turborepo pipeline
├── tsconfig.base.json  # Shared TS config
├── .prettierrc         # Formatting
├── .github/workflows/  # CI
├── docker-compose.yml  # PostgreSQL + pgAdmin
└── Caddy reverseproxy  # SSL termination
```

### Was gut ist ✅

- **pnpm + Turborepo** ist die richtige Wahl für ein TypeScript-Monorepo. Dependency Hoisting, Task Caching, Parallel Builds.
- **Saubere Workspace-Definition** in `pnpm-workspace.yaml` mit klarem `packages/*` + `packages/plugins/*` Pattern.
- **Turborepo Pipeline** ist korrekt konfiguriert: `build` depends on `^build` (topological), `dev` ist persistent, `lint`/`format:check` sind unabhängig.
- **tsconfig.base.json** mit `strict: true`, `noUncheckedIndexedAccess: true` — das ist vorbildlich. Strict TypeScript von Tag 1.
- **Docker Compose** für PostgreSQL + pgAdmin — einfaches lokales Setup.
- **CI Pipeline** mit Prettier + Build + Lint Checks — verhindert kaputte Commits.
- **MIT Lizenz** — richtig für ein Open-Source-E-Commerce-System.
- **Caddy** als Reverse Proxy mit Auto-SSL — simplere und modernere Wahl als Nginx.

### Was verbesserbar ist ⚠️

- **Kein `docker-compose.yml` für das gesamte System** — nur PostgreSQL. Für Contributors wäre ein `docker-compose up` das alle Services startet ideal.
- **Kein `.nvmrc` oder `engines` Feld** — Node.js Version nicht gepinnt (README sagt 22+, aber nicht enforced).
- **Kein Lockfile-Check in CI** — `--frozen-lockfile` ist gut, aber ein expliziter Check dass `pnpm-lock.yaml` committed ist fehlt.
- **Turbo Cache** nutzt nur lokalen Cache, kein Remote Caching (Vercel/custom) konfiguriert.

### Bewertung: 8/10

---

## 2. packages/database

### Was es macht

Drizzle ORM Schemas für PostgreSQL. 23+ Migrationen. Zentrale Datenbankdefinition für alle anderen Packages.

### Schema-Analyse

**Tabellen (vollständig):**

| Tabelle                                  | Zweck                  | Qualität                                                               |
| ---------------------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `products`                               | Hauptprodukte          | ✅ Sehr gut — Indizes auf slug, status, sku, created_at                |
| `product_variants`                       | Varianten              | ✅ Gut — Index auf product_id                                          |
| `product_attributes`                     | Attribute-Definitionen | ✅ OK                                                                  |
| `product_categories`                     | M:N Junction           | ✅ Korrekt                                                             |
| `product_translations`                   | i18n für Produkte      | ✅ Gut gelöst                                                          |
| `product_images`                         | Medien-Zuordnung       | ✅ OK                                                                  |
| `product_reviews`                        | Kundenbewertungen      | ✅ OK                                                                  |
| `categories`                             | Baumstruktur           | ⚠️ parentId Ansatz — funktioniert, aber bei tiefen Hierarchien langsam |
| `customers`                              | Endkunden              | ✅ Gut — passwordHash, resetToken, orderCount Counter                  |
| `addresses`                              | Kundenadressen         | ✅ Gut                                                                 |
| `carts` / `cart_items`                   | Warenkörbe             | ✅ Gut — sessionId + customerId Pattern                                |
| `orders` / `order_items`                 | Bestellungen           | ✅ Sehr gut — Status History, Tax Breakdown                            |
| `order_status_history`                   | Audit Trail            | ✅ Vorbildlich                                                         |
| `payments`                               | Zahlungen              | ✅ OK                                                                  |
| `shipping_methods`                       | Versandarten           | ✅ OK                                                                  |
| `tax_classes/zones/rules`                | Steuersystem           | ✅ Sehr durchdacht — EU Reverse Charge                                 |
| `users`                                  | Admin-Benutzer         | ✅ Gut — Role-based                                                    |
| `plugins` / `plugin_settings`            | Plugin Registry        | ✅ Gut                                                                 |
| `search_logs` / `search_clicks`          | Search Analytics       | ✅ Clever                                                              |
| `product_impressions`                    | View/Click Tracking    | ✅ Für Ranking-Algorithmus                                             |
| `chat_sessions` / `chat_messages`        | Chatbot                | ✅ OK                                                                  |
| `pages` / `page_translations`            | CMS                    | ✅ Gut                                                                 |
| `theme_settings`                         | Theme Customization    | ✅ OK                                                                  |
| `currencies` / `product_currency_prices` | Multi-Currency         | ✅ Gut                                                                 |
| `wishlists` / `wishlist_items`           | Wunschlisten           | ✅ OK                                                                  |
| `coupons` / `coupon_usages`              | Gutscheine             | ✅ Per-Customer Usage Tracking                                         |
| `marketplace_*`                          | Multi-Channel          | ✅ Connections, Listings, Orders, Sync Logs                            |
| `mobile_app_config`                      | App Config             | ✅ OK                                                                  |
| `email_logs`                             | Email Audit            | ✅ Gut                                                                 |
| `languages`                              | Sprach-Management      | ✅ OK                                                                  |

### Was besonders gut ist ✅

1. **Preise in Cents (Integer)** — Korrekt! Keine Floating-Point Fehler. Das machen viele falsch.
2. **UUID Primary Keys** — Richtig für verteilte Systeme, keine Auto-Increment Leaks.
3. **Indizes sind sinnvoll gesetzt** — `products_slug_idx`, `products_status_idx`, `orders_created_at_idx` etc.
4. **Relations sauber definiert** — Drizzle Relations für alle Tabellen korrekt.
5. **`onDelete: 'cascade'`** wo es Sinn macht (order_items, cart_items, addresses).
6. **`withTimezone: true`** bei allen Timestamps — kein UTC-Chaos.
7. **Migration-Naming** ist chronologisch und deskriptiv.

### Was fehlt oder problematisch ist ⚠️

1. **Kein Composite Primary Key auf `product_categories`** — Die Junction-Table hat keinen PK definiert! Das erlaubt Duplikate.

   ```typescript
   // IST:
   export const productCategories = pgTable('product_categories', {
     productId: uuid('product_id')...
     categoryId: uuid('category_id')...
   });

   // SOLL:
   // primaryKey({ columns: [productCategories.productId, productCategories.categoryId] })
   ```

2. **Kein Index auf `orders.customerId`** — Wait, doch, es gibt `orders_customer_id_idx`. ✅

3. **`categories` Baum ohne Materialized Path oder Closure Table** — `parentId` funktioniert für 2-3 Ebenen, aber bei tiefen Hierarchien braucht man Recursive CTEs für jede Abfrage. Für E-Commerce OK, aber nicht optimal.

4. **`products.currency` ist per Produkt** — Das kann bei Multi-Currency verwirrend sein. Besser wäre ein globaler Default + Currency-Conversion. Allerdings gibt es `product_currency_prices` — also ist das Design bewusst.

5. **Kein Soft Delete** — Produkte und Bestellungen werden hart gelöscht. Für E-Commerce in der EU (Aufbewahrungspflichten!) ist das problematisch.

6. **`customers.orderCount` und `totalSpent`** sind denormalisiert — gut für Performance, aber muss manuell konsistent gehalten werden. Race Conditions bei parallelen Order-Erstellungen möglich.

7. **Keine DB-Level Constraints für Preis > 0** — Nur Zod-Validation im Application Layer. Ein `CHECK (price >= 0)` wäre Defense-in-Depth.

8. **`product_variants.attributes` ist JSONB** — Flexibel, aber nicht queryable ohne GIN Index. Fehlt.

### Bewertung: 8/10

---

## 3. packages/shared

### Was es macht

Cross-Package Types, Zod Validation Schemas, Utility Functions, Error Classes, Constants.

### Analyse

**Exports:**

- `types/index.ts` — Product, Order, Customer, Cart, etc. TypeScript Interfaces
- `schemas/` — Zod Schemas für API Validation (product.ts, order.ts, common.ts)
- `errors/index.ts` — Custom Error Classes (AppError, NotFoundError, ValidationError, etc.)
- `utils/index.ts` — `formatPrice()`, `generateSlug()`, `formatDate()`
- `constants/index.ts` — ORDER_STATUSES, PRODUCT_STATUSES, CURRENCIES, etc.

### Was besonders gut ist ✅

1. **Zod Schemas für API Validation** — Konsistente Validation an einem Ort, wiederverwendbar in API + Frontend.
2. **Custom Error Hierarchy** — `AppError` → `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ConflictError`, `ForbiddenError` mit HTTP Status Codes. Sauber.
3. **`formatPrice()`** mit Intl.NumberFormat — Korrekte Lokalisierung.
4. **`generateSlug()`** — Slug-Generierung mit Sanitization.
5. **PaginationSchema** — Zentral definiert, DRY.

### Was verbesserbar ist ⚠️

1. **Types und Schemas sind nicht 1:1 synced** — Die TypeScript Interfaces in `types/` und die Zod Schemas in `schemas/` sind manuell synchron gehalten. Besser: `z.infer<typeof ProductSchema>` als einzige Wahrheit.
2. **`formatPrice()` ist im Shared Package** — Macht Sinn, aber es gibt auch eine Kopie im Storefront. DRY-Verletzung.
3. **Keine Runtime-Type-Guards** — Nur Zod `.parse()`. Für interne Calls wäre `.safeParse()` mit Logging besser.

### Bewertung: 8/10

---

## 4. packages/core

### Was es macht

Business Logic Layer. Services, Repositories, Event System. **Kein HTTP, keine direkte DB-Abhängigkeit in den Services** (Dependency Injection).

### Analyse der Domains

#### 4.1 Products (service.ts, repository.ts)

**Service:** CRUD, Slug-Generierung, Inventory Management, Category Assignment.

**Was gut ist:**

- Constructor Injection mit typed Dependencies (`ProductServiceDeps`)
- Events werden nach Writes gefeuert (`PRODUCT_EVENTS.CREATED`, etc.)
- Repository Pattern sauber implementiert
- Plugin Filter Support (`pluginLoader.applyFilters`)

**Was fehlt:**

- Kein Bulk-Import/Export
- Inventory-Reservierung bei Cart-Add fehlt (Race Condition bei gleichzeitigen Käufen)

#### 4.2 Orders (service.ts)

**Was gut ist:**

- Order Number Generation
- Status Machine mit History Tracking
- Tax Breakdown in Order gespeichert (Snapshot zum Zeitpunkt der Bestellung)

**Was fehlt:**

- Kein Order State Machine mit erlaubten Übergängen (pending → confirmed → shipped → delivered). Aktuell kann jeder Status auf jeden anderen gesetzt werden.
- Kein Partial Refund
- Keine Storno-Logik mit Inventory-Rückbuchung

#### 4.3 Payments (service.ts)

**Was gut ist:**

- Payment Provider Abstraction
- Webhook Verification
- Demo-Complete Endpoint für Checkout

**Was kritisch ist:**

- `demo-complete` Endpoint erstellt Orders direkt — gut für Demo, aber in Production sollte der Payment Intent erst nach Stripe Webhook confirmed werden. Es gibt einen echten Stripe Flow, aber der Demo-Flow ist prominent.

#### 4.4 Tax (service.ts)

**Was gut ist:**

- Echtes Tax System mit Classes, Zones, Rules
- EU Reverse Charge Detection
- VAT Number Validation (VIES API)
- Per-Item Tax Calculation mit Breakdown
- Plugin Filter Support für Custom Tax Logic

**Sehr durchdacht.** Das ist auf dem Level von Shopware/Medusa.

#### 4.5 Search (service.ts, repository.ts, ranking.ts)

**Das ist das Highlight des gesamten Projekts.** 🌟

**Features:**

- Full-Text Search mit PostgreSQL `ts_vector` / `ts_query`
- AI-Enhanced Query Understanding (Synonym-Expansion, Typo-Fixing, Price-Detection)
- Smart Ranking mit CTR, Conversion Rate, Recency, Stock Level als Faktoren
- Instant Search (Lightweight, max 8 Results für Overlay)
- Search Analytics (Queries, CTR, Zero-Result Searches)
- "Did you mean?" Suggestions
- Trending Products Algorithmus
- Product Impressions Tracking

**Was besonders gut ist:**

- Graceful Degradation: AI fällt auf Basic Search zurück
- Ranking-Boost-Formel: `1 + (ctrBoost × 0.3) + (convBoost × 0.4) + (recencyBoost × 0.15) + (stockBoost × 0.15)`
- Fire-and-forget Analytics Logging (blockiert nicht die Suche)
- Plugin Filter Support (`search:query`, `search:results`)

**Was fehlt:**

- Kein Faceted Search (Filter nach Attributen mit Counts)
- Kein Elasticsearch/Meilisearch Integration (PostgreSQL FTS hat Limits bei >50k Produkten)
- Semantic Search ist vorbereitet (`SemanticSearchProvider` Interface), aber nicht implementiert

#### 4.6 Cart (service.ts)

**Was gut ist:**

- Session-based für anonyme User, Customer-based für eingeloggte
- Preise werden IMMER aus DB gelesen, nie vom Client vertraut — **Security Best Practice**
- i18n-aware (Produktnamen werden übersetzt)
- Plugin Filter Support

**Was fehlt:**

- Kein Cart Expiration (alte Carts bleiben für immer)
- Keine Cart Merge bei Login (anonymer Cart + Customer Cart)
- Kein Cart Recovery / Abandoned Cart Emails

#### 4.7 Chatbot (service.ts)

**Was gut ist:**

- AI-powered Product Recommendations
- Kontext-Injection: Produkte, Versandarten, FAQ
- Rate Limiting pro Session
- Chat History Persistence
- Action Parsing: "Add to Cart" und "Quick Checkout" Links in Antworten

**Was verbesserbar ist:**

- Alle Produkte werden als Kontext injiziert — bei 10.000+ Produkten sprengt das den Token-Limit
- Kein Streaming (Antwort kommt komplett)

#### 4.8 Plugin System (plugin-loader.ts, event-bus.ts)

**Das ist das zweitbeste Feature nach der Suche.** 🌟

**Features:**

- Legacy Plugin API (backward compat)
- SDK Plugin API (neue, saubere API)
- Plugin Discovery (scannt `node_modules` nach `forkcart-plugin-*`)
- Plugin Installation via `pnpm add` (CLI)
- Activation/Deactivation mit Lifecycle Hooks (onActivate, onDeactivate, onInstall, onUninstall, onUpdate)
- Hook System (wie WordPress `add_action`)
- Filter System (wie WordPress `apply_filters`)
- Storefront Slots (Plugins können HTML in definierte Slots injizieren)
- CLI Commands (Plugins können eigene CLI Commands registrieren)
- Scheduled Tasks (Plugins können Cron Jobs registrieren)
- Permission System (Plugins deklarieren benötigte Permissions)
- Secret Encryption (Plugin Settings mit sensitiven Daten werden verschlüsselt)
- Provider Bridging (SDK Plugins → bestehende Payment/Email/Marketplace Registries)

**Was besonders gut ist:**

- WordPress-inspiriertes Hook/Filter System — bekannt, erprobt, verständlich
- Encryption für Secrets mit AES-256-GCM, per-Installation Salt, Migration von Plaintext → Encrypted
- Package Name Validation gegen Command Injection (`VALID_PACKAGE_NAME_REGEX`)
- Graceful Error Handling in Hooks (Plugin-Fehler crashen nicht den Server)

**Was kritisch ist (und im Code selbst dokumentiert!):**

- `⚠️ SECURITY WARNING (RVS-012): The raw database handle (db) is exposed to plugins` — Ein bösartiges Plugin hat vollen DB-Zugriff. Das ist ein echtes Risiko. TODO im Code: Scoped Database Proxy.
- Plugin-Code wird via `import()` geladen — kein Sandboxing. Ein Plugin kann beliebigen Code ausführen.
- Scheduled Tasks werden registriert aber es gibt keinen Scheduler der sie ausführt — das ist nur eine Registry ohne Cron-Engine!

#### 4.9 Marketplace (service.ts, types.ts)

**Was gut ist:**

- Clean Marketplace Provider Interface
- Marketplace Connections, Listings, Orders, Inventory Sync
- Sync Logs für Debugging

**Was ist:** Eine Fassade. Die Interfaces sind sauber, aber die Implementierungen sind nicht production-ready (siehe Plugin-Analyse unten).

#### 4.10 Email System

**Was gut ist:**

- Provider Registry (Mailgun, SMTP, erweiterbar)
- Email Templates mit HTML (Order Confirmation, etc.)
- Email Logging in DB
- `escapeHtml()` in Templates — XSS Prevention

**Was fehlt:**

- Kein Template Engine (Handlebars, Mjml) — HTML wird manuell zusammengebaut
- Keine Queue für Email-Sending (synchron)

#### 4.11 Mobile App Service

**Was gut ist:**

- Idea: Admin konfiguriert App-Name, Colors, Logo → generiert Expo Project als ZIP
- Native Android Build via Gradle (experimentell)

**Was es ist:** Ein Proof of Concept. Die Idee ist gut, aber der Native Builder braucht Android SDK auf dem Server, was unrealistisch für die meisten Deployments ist.

### Core Bewertung: 8.5/10

---

## 5. packages/api

### Was es macht

Hono REST API. Alle HTTP Endpoints, Middleware, Request Validation, Response Formatting.

### Analyse

#### 5.1 App Setup (app.ts)

**Was gut ist:**

- Saubere Dependency Injection: Alle Services werden erstellt und an Routes übergeben
- Middleware-Stack: Logger → Error Handler → Rate Limit → CORS → Auth
- Graceful Shutdown Handler
- Media Upload Directory wird automatisch erstellt

**Was verbesserbar ist:**

- `app.ts` ist ~600+ Zeilen — zu groß. Die Service-Instantiierung sollte in eine Factory ausgelagert werden.
- Alle Services werden beim Start erstellt, auch wenn nie gebraucht — kein Lazy Loading

#### 5.2 Middleware

**auth.ts:**

- JWT Verification mit `jose` (Standard-Bibliothek)
- Token Blacklisting für Logout
- Separate Admin Auth und Customer Auth

**rate-limit.ts:**

- In-Memory Token Bucket (Rate Limit pro IP)
- Konfigurierbar (requests, window)

**⚠️ Kritik:** In-Memory Rate Limiting funktioniert nicht bei Multi-Instance Deployment (kein Redis-Backend).

**error-handler.ts:**

- Centralized Error Handling
- Mappt AppError Subklassen auf HTTP Status Codes
- Zod Validation Errors werden sauber formatiert
- Stack Traces nur in Development

**Sehr gut gelöst.**

**permissions.ts:**

- `requireRole('admin', 'superadmin')` — Role-based Access Control
- Sauber als Hono Middleware

#### 5.3 Routes

34 Route-Dateien in `routes/v1/`. Sehr vollständig:

- auth, customer-auth, users
- products, categories, variants, attributes, product-images, product-translations
- orders, carts, payments
- search (inkl. Analytics)
- shipping, tax
- coupons, wishlists, reviews
- pages, seo, theme-settings
- currencies, translations
- plugins, marketplace
- ai, chat, emails
- media, cache, mobile-app

**Was gut ist:**

- Konsistentes Pattern: Zod Validation → Service Call → JSON Response
- `requireRole()` auf allen Admin-Routes
- Public Routes korrekt identifiziert (GET products, categories, search, etc.)
- Pagination ist standardisiert

**Was verbesserbar ist:**

- Keine OpenAPI/Swagger Spec Generation — bei 34 Route-Dateien wäre das extrem wertvoll
- Keine Response Type Definitions (nur Request Validation)
- Einige Routes haben Business Logic (z.B. `demo-complete` in payments) — sollte in Services sein

### API Bewertung: 8/10

---

## 6. packages/admin

### Was es macht

Next.js 15 Admin Panel mit React Query, Tailwind CSS, shadcn/ui.

### Analyse

**Seiten:**

- Dashboard (Stats, Revenue, Recent Orders)
- Products (CRUD, Images, Variants, Translations, Currency Prices)
- Categories
- Orders (List, Status Updates)
- Customers
- Coupons
- Shipping Methods
- Tax (Classes, Zones, Rules)
- Search Analytics
- Plugins
- Marketplace
- AI Settings
- Chatbot Config
- Email Logs
- Pages (Page Builder!)
- SEO
- Reviews
- Wishlists
- Currencies
- Translations/Languages
- Theme Settings
- Mobile App Config
- User Management
- Settings

**Das ist ein vollständiges Admin Panel.** Für ein Open-Source-Projekt dieses Alters bemerkenswert.

### Was besonders gut ist ✅

1. **Page Builder mit Craft.js** — Drag & Drop, 21 Block-Typen, Templates. Das ist ein echtes Alleinstellungsmerkmal.
2. **React Query für Server State** — Korrekte Cache-Invalidierung, Optimistic Updates.
3. **shadcn/ui Components** — Modern, accessible, consistent.
4. **Product Form mit Translations Overlay** — Default-Language-Translation wird auf das Formular gemergt. Clever.

### Was verbesserbar ist ⚠️

1. **Kein Admin i18n** — Das Admin Panel ist englisch-only. Die `admin-en.json` und `admin-de.json` existieren, aber sind klein (102 Zeilen) und nicht integriert.
2. **Keine Keyboard Shortcuts** — Ein Admin Panel profitiert enorm davon.
3. **Kein Bulk-Actions** — Keine Multi-Select + Bulk-Delete/Status-Change für Produkte/Orders.
4. **Dashboard ist Basic** — Nur 4 Stats + Recent Orders. Kein Chart, kein Revenue-Graph.
5. **Kein Dark Mode Toggle** — Tailwind Dark Mode ist konfiguriert aber nicht aktivierbar.

### Bewertung: 7.5/10

---

## 7. packages/storefront

### Was es macht

Next.js 15 Storefront mit SSR, i18n Routing, Theme Customization.

### Analyse

**Seiten:**

- Homepage (Page Builder Rendered)
- Product List / Grid mit Pagination & Sort
- Product Detail (Images, Variants, Add to Cart, Reviews)
- Category Pages
- Search (Instant Search Overlay + Suchseite)
- Cart
- Checkout (Adresse → Zahlung → Bestätigung)
- Account (Login, Register, Profil, Adressen, Bestellungen)
- Wishlist
- CMS Pages (Page Builder Rendered)

### Was besonders gut ist ✅

1. **Page Builder Renderer** — Server-Side Rendering von Craft.js Daten OHNE Craft.js Runtime. Zero JS Overhead. **Brilliant.**
2. **i18n Routing** — URL-basiert (`/products` = Default Locale, `/en/products` = Nicht-Default). Next.js Middleware.
3. **Theme CSS Variables** — Admin setzt Farben/Fonts → CSS Custom Properties → Storefront styled sich dynamisch.
4. **StorefrontSlot Component** — Plugin-Content wird an definierten Stellen (head, body-start, body-end) eingeblendet.
5. **API Client** mit automatischer Token-Renewal und Error Handling.
6. **Instant Search** mit Cmd+K Shortcut.

### Was verbesserbar ist ⚠️

1. **Kein ISR (Incremental Static Regeneration)** — Alle Seiten sind dynamisch (SSR). Für Produktseiten wäre ISR mit Revalidation ein enormer Performance-Gewinn.
2. **Kein Image Optimization** — Next.js `<Image>` wird teilweise genutzt, aber die Media-URLs werden nicht über die Next.js Image Optimization Pipeline geleitet.
3. **Kein Structured Data (JSON-LD)** — Für SEO bei E-Commerce extrem wichtig (Product, BreadcrumbList, Organization).
4. **Checkout hat keinen Guest Checkout** — Man muss sich registrieren. Das ist ein Conversion-Killer.
5. **Kein Cookie Consent Banner** — In der EU Pflicht (DSGVO/ePrivacy).

### Bewertung: 7.5/10

---

## 8. packages/ai

### Was es macht

AI Provider Registry mit Support für OpenRouter und Google Gemini. Text Generation und Chat APIs.

### Analyse

**Providers:**

- OpenRouter (alle OpenAI-kompatiblen Models)
- Google Gemini (native API)
- Konfigurierbar über Admin UI

**Was gut ist:**

- Provider Abstraction — leicht erweiterbar
- Graceful Fallback wenn kein AI konfiguriert
- Temperature, MaxTokens konfigurierbar
- Settings in DB gespeichert (nicht in .env hardcoded)

**Was fehlt:**

- Kein Streaming Support
- Kein Ollama Provider (README erwähnt es, Code hat es nicht)
- Kein Anthropic Direct Provider (nur über OpenRouter)
- Kein Cost Tracking / Token Usage Logging
- Keine Rate Limiting für AI Calls

### Bewertung: 6.5/10

---

## 9. packages/i18n

### Was es macht

Internationalization System mit Locale Files und React Integration.

### Analyse

**Locales:**

- `en.json` (324 Zeilen) — Storefront
- `de.json` (322 Zeilen) — Storefront
- `admin-en.json` (102 Zeilen) — Admin
- `admin-de.json` (102 Zeilen) — Admin

**Features:**

- `useTranslation()` Hook für React
- `t('key.path')` mit Dot Notation
- `t('key', { name: 'World' })` Interpolation
- Locale Detection und URL-basiertes Routing
- Generated Locale Registry (`_locales.generated.ts`)

### Was gut ist ✅

- React Integration ist sauber
- Namespace Support (admin vs storefront)
- Interpolation funktioniert

### Was kritisch ist ⚠️

1. **Nur 2 Sprachen** — Für ein internationales E-Commerce-System extrem wenig. Mindestens FR, ES, IT, NL wären nötig.
2. **Storefront Translations sind dünn** — 322 Keys decken nicht alle Edge Cases ab. Checkout-Flow, Error Messages, Email Subjects fehlen teilweise.
3. **Admin Panel nutzt die Translations kaum** — Die meisten Admin-Texte sind hardcoded English.
4. **Kein Pluralization** — `t('items', { count: 5 })` → "5 items" vs "1 item" nicht unterstützt.
5. **Kein RTL Support** — Arabisch, Hebräisch nicht möglich.
6. **Keine Currency/Date Formatierung** im i18n Package — das ist im `shared` Package separat.

### Bewertung: 5.5/10

Das i18n ist mehr Fassade als vollständige Lösung. Die Grundstruktur ist da, aber für echte Internationalisierung fehlt viel.

---

## 10. packages/plugin-sdk

### Was es macht

TypeScript Interfaces und Helper für Plugin-Entwicklung.

### Analyse

**Exports:**

- `definePlugin()` — Factory Function für Plugin-Definition
- TypeScript Interfaces: PluginDefinition, PluginContext, PluginSettings, etc.
- Lifecycle Hooks: onActivate, onDeactivate, onInstall, onUninstall, onUpdate
- Provider Interfaces: PaymentProvider, EmailProvider, MarketplaceProvider
- Storefront Slots, CLI Commands, Scheduled Tasks, Permissions
- Event Hooks und Filters

### Was besonders gut ist ✅

1. **Sehr vollständige Plugin API** — Settings, Hooks, Filters, Slots, CLI, Tasks, Permissions, Migrations. Das ist auf Shopware-Level.
2. **TypeScript-first** — Plugin-Entwickler bekommen volle Type Safety.
3. **`definePlugin()` Helper** — Wie Vue's `defineComponent()`. Gute DX.
4. **WordPress-inspiriertes Hook/Filter System** — Bekannt, erprobt.

### Was verbesserbar ist ⚠️

1. **Keine Plugin Testing Utils** — Kein `createTestPluginContext()` oder Mock Helpers.
2. **Keine Plugin Template/Scaffold** — `forkcart plugin create my-plugin` wäre ideal.
3. **Docs für Plugin-Entwicklung fehlen** — Das SDK hat gute Types aber keine Prosa-Dokumentation.
4. **Migrations Interface existiert, aber kein Runner** — Plugins können Migrations deklarieren, aber es gibt keinen Code der sie ausführt.

### Bewertung: 8/10

---

## 11. packages/plugins/\*

### 11.1 Stripe Plugin

**Was es macht:** Stripe Payment Intent API Integration.

**Was gut ist:**

- Webhook Signature Verification (sicher)
- Payment Intent → Confirm → Capture Flow
- Client Config für Stripe.js im Frontend
- Required Settings klar definiert

**Was verbesserbar ist:**

- Kein Subscription/Recurring Support
- Kein Stripe Connect (für Marktplätze)
- Kein Refund API

**Bewertung: 7/10** — Funktional für einfache Payments.

### 11.2 Mailgun Plugin

**Was gut ist:**

- Saubere Email Provider Implementation
- Template Support
- Domain + API Key konfigurierbar

**Bewertung: 7/10**

### 11.3 SMTP Plugin

**Was gut ist:**

- Nodemailer-basiert
- TLS Support
- Standard SMTP Konfiguration

**Bewertung: 7/10**

### 11.4 Marketplace Plugins (Amazon, eBay, Otto, Kaufland)

**Hier wird es kritisch.**

Alle vier Marketplace-Plugins haben das gleiche Problem: **Sie sind Skeleton-Implementierungen.**

```typescript
// Amazon Plugin — Typisches Pattern:
async listProduct(product: MarketplaceProductInput): Promise<MarketplaceListing> {
  // SP-API: PutListingsItem
  // TODO: Implement actual SP-API call
  throw new Error('Not implemented yet');
}
```

**Was da ist:**

- Plugin Definition mit Settings (API Keys, Region, etc.)
- Auth Flow Skeletons (OAuth für Amazon, eBay; API Key für Otto, Kaufland)
- Provider Interface Implementation (alle Methoden vorhanden)

**Was NICHT da ist:**

- Keine echten API Calls
- Keine OAuth Token Refresh Logic
- Keine Error Handling für Marketplace-spezifische Fehler
- Keine Tests

**Bewertung: 3/10** — Rein deklarativ. Kein einziger Marketplace-Call funktioniert tatsächlich.

**Meine Empfehlung:** Entweder als "Coming Soon" markieren oder einen Marketplace (z.B. eBay, weil die API am einfachsten ist) komplett implementieren als Referenz.

---

## 12. packages/mobile

### Was es macht

React Native / Expo App Template für einen Mobile Storefront.

### Analyse

**Was da ist:**

- Expo Router Setup mit Tab Navigation
- Home, Products, Cart, Account Screens
- API Client (`lib/api.ts`)
- Theme Configuration (`theme/index.ts`)
- Konfigurierbar über Admin Panel (App Name, Colors, Logo)

**Was gut ist:**

- Die Idee: Admin konfiguriert → generiert angepasstes Expo Projekt → Download als ZIP
- Saubere Expo Router Struktur
- API Client der auf dieselbe Hono API zugreift

**Was fehlt/problematisch ist:**

- Die Screens sind Stubs (basic UI, keine echte Funktionalität)
- Kein Push Notifications Setup
- Kein Offline Support
- Die "Build Android APK" Funktion braucht Android SDK auf dem Server — unrealistisch
- Kein iOS Build Support

**Bewertung: 4/10** — Gutes Konzept, aber noch ein Proof of Concept.

---

## 13. packages/cli

### Was es macht

CLI Tool für ForkCart Administration.

### Analyse

**Commands:**

- `plugin list` — Alle Plugins anzeigen
- `plugin install <name>` — Plugin installieren
- `plugin activate/deactivate <id>` — Plugin steuern
- `plugin discover` — Neue Plugins finden
- Plugin CLI Commands ausführen

**Was gut ist:**

- Commander.js basiert — Standard Library
- Delegiert an die Core Plugin Loader API

**Was fehlt:**

- `init` Command (Neues ForkCart Projekt erstellen)
- `migrate` Command
- `seed` Command
- `dev` Command (alle Services starten)
- `build` Command
- `deploy` Command

**Bewertung: 5/10** — Minimal viable. Nur Plugin-Management.

---

## 14. Systemweite Analyse

### 14.1 Architektur

**Ist die Monorepo-Struktur sauber?**

**Ja, größtenteils.** Die Dependency-Richtung ist korrekt:

```
database ← shared ← core ← api
                        ↗ admin
                        ↗ storefront
                        ↗ plugins
                        ↗ cli
```

- `shared` hat keine Abhängigkeiten zu anderen Packages ✅
- `core` hängt nur von `database` und `shared` ab ✅
- `api` hängt von `core`, `database`, `shared` ab ✅
- `admin`/`storefront` hängen nur von `shared` ab (API-Zugriff über HTTP) ✅
- `plugins` hängen von `plugin-sdk` ab ✅

**Ein Problem:** `core` hat eine direkte Abhängigkeit zu `@forkcart/database` und importiert Schema-Definitionen direkt. Besser wäre es, wenn `core` nur über Repository-Interfaces auf die DB zugreift. Aktuell ist das teilweise so (Products, Orders haben Repositories), aber Search und einige andere Services nutzen `db.execute()` direkt.

### 14.2 Developer Experience (DX)

**Was gut ist:**

- `ARCHITECTURE.md` ist exzellent — erklärt den Stack, die Konventionen, das "Rezept" für neue Features
- `API.md` ist eine vollständige API-Referenz
- `FEATURES.md` gibt einen klaren Überblick
- Turborepo + pnpm = schnelle Builds
- TypeScript Strict Mode = weniger Bugs

**Was fehlt:**

- `CONTRIBUTING.md` — Wie trägt man bei? Branch Strategy? Code Review Process?
- Kein `pnpm dev` Script das ALLE Services startet
- Kein `.env.example` mit allen nötigen Variablen
- Kein Storybook für UI Components
- Kein API Playground (Swagger UI / Postman Collection)

### 14.3 Security

**Nach dem Audit (31 Findings, alle gefixt) — was bleibt?**

**Gefixt (basierend auf Code-Evidenz):**

- ✅ RVS-012: Plugin DB Access Warning dokumentiert
- ✅ RVS-013: Encryption Salt per Installation, nicht hardcoded
- ✅ RVS-017: Per-Customer Coupon Usage Limits (DB-backed)
- ✅ RVS-027: Encryption Key required in Production
- ✅ bcrypt mit 12 Rounds (Customer Auth)
- ✅ JWT Secret Validation (min 32 chars)
- ✅ HTML Escaping in Email Templates
- ✅ Package Name Validation gegen Command Injection
- ✅ Rate Limiting (API + Chatbot)
- ✅ CORS konfiguriert
- ✅ Zod Validation auf allen Inputs

**Was ich noch gefunden habe:**

1. **🔴 Plugin System = Remote Code Execution** — `pnpm add <package>` + `import()` = beliebiger Code. Das ist by-design, aber es gibt kein Plugin Review/Signing. Jeder kann ein malicious `forkcart-plugin-malware` Package publishen.

2. **🟡 Rate Limiting ist In-Memory** — Bei Horizontaler Skalierung (mehrere Instanzen) ist das Rate Limiting nutzlos. Redis-Backend nötig.

3. **🟡 JWT Token Blacklisting ist In-Memory** — Gleiche Problem. Nach Server-Restart funktioniert Logout nicht mehr.

4. **🟡 Media Upload: Keine Virus-Scanning** — `multer` Upload ohne Content-Type Validation. Ein Angreifer könnte malicious Files hochladen.

5. **🟡 `demo-complete` Endpoint** — Erstellt Orders ohne echte Payment Verification. Sollte in Production deaktiviert oder durch Feature Flag geschützt sein.

6. **🟡 Kein CSRF Protection** — API ist Bearer Token basiert (kein Cookie-Auth für Admin), aber der Storefront Customer Auth nutzt Cookies teilweise.

7. **🟢 Passwort-Hashing** — bcrypt mit 12 Rounds ist gut. Argon2id wäre besser, aber bcrypt ist akzeptabel.

8. **🟢 SQL Injection** — Drizzle ORM parametrisiert alle Queries. Raw SQL (in Search) nutzt `dsql` Template Tags korrekt.

### 14.4 Performance

**N+1 Queries?**

Teilweise. Die Product List Query holt Produkte, dann für jedes Produkt separat Translations und Images. Das ist ein N+1 Pattern.

```typescript
// In Search Service:
const [imageMap, nameMap] = await Promise.all([
  this.getProductImages(ids), // 1 Query für alle
  this.getTranslatedNames(ids), // 1 Query für alle
]);
```

Hier wird es korrekt gemacht — Batch-Queries. Aber in einigen Admin-Endpoints werden Relations einzeln geladen.

**Fehlende Indizes?**

- ⚠️ `product_variants.attributes` (JSONB) — Kein GIN Index für Attribut-basierte Suche
- ⚠️ `product_categories` — Kein Composite Index/PK
- ⚠️ `product_translations` — Kein Index auf `(product_id, locale)`
- ⚠️ `search_logs` — Kein Index auf `created_at` für Analytics-Queries

**Caching?**

- ✅ Storefront Theme Settings: Next.js `revalidate: 60` (60s Cache)
- ❌ Kein Redis/In-Memory Cache für häufige API Calls
- ❌ Kein HTTP Cache Headers (ETags, Cache-Control) auf API Responses
- ❌ Kein Query-Level Caching in Core Services

### 14.5 Skalierbarkeit

**Was bricht bei 10k Produkten?**

- PostgreSQL FTS wird spürbar langsamer
- Chatbot Context (alle Produkte als System Prompt) wird zu groß
- Product List ohne Cursor-based Pagination wird langsam

**Was bricht bei 100k Produkten?**

- PostgreSQL FTS ist nicht mehr praktikabel → Elasticsearch/Meilisearch nötig
- `SELECT COUNT(*)` für Pagination wird langsam → Estimated Counts nötig
- Category-Baum mit `parentId` und Recursive CTEs wird teuer
- Product Import/Export ohne Streaming ist unmöglich
- In-Memory Rate Limiting und Token Blacklisting brauchen Redis

**Was bricht bei 1000+ Orders/Tag?**

- Synchrones Email-Sending blockiert Response Time → Queue nötig
- Order Number Generation könnte Konflikte haben bei Parallelität
- Customer `orderCount`/`totalSpent` Counter Updates → Race Conditions

### 14.6 Plugin System — Wie erweiterbar ist es wirklich?

**Sehr erweiterbar.** Das Plugin-System ist eines der besten Features:

| Feature           | Status             | Vergleich                     |
| ----------------- | ------------------ | ----------------------------- |
| Event Hooks       | ✅                 | Wie Shopware/WordPress        |
| Data Filters      | ✅                 | Wie WordPress `apply_filters` |
| Custom API Routes | ✅ (via Hooks)     | Wie Medusa                    |
| Admin Pages       | ✅ (deklariert)    | Wie Shopware                  |
| Storefront Slots  | ✅                 | Wie Shopware Twig Blocks      |
| CLI Commands      | ✅                 | Einzigartig                   |
| Scheduled Tasks   | ✅ (Registry only) | Wie Shopware                  |
| DB Migrations     | ✅ (deklariert)    | Wie Medusa                    |
| Permissions       | ✅                 | Wie Shopware                  |
| Secret Encryption | ✅                 | Besser als Medusa             |

**Was fehlt für ein vollständiges Plugin Ecosystem:**

- Plugin Marketplace (npm ist der Fallback, aber ein dedizierter Marketplace wäre besser)
- Plugin Sandboxing (V8 Isolates oder Deno-style Permissions)
- Plugin Version Compatibility Check
- Plugin Dependency Resolution (Plugin A braucht Plugin B)

### 14.7 AI Integration

**Wie tief/gut ist sie?**

| Feature                        | Tiefe  | Bewertung                                          |
| ------------------------------ | ------ | -------------------------------------------------- |
| Search Enhancement             | Tief   | ✅ Synonym-Expansion, Typo-Fixing, Price-Detection |
| Product Description Generation | Mittel | ✅ Funktioniert, aber Basic Prompt                 |
| SEO Text Generation            | Mittel | ✅ Funktioniert                                    |
| Chatbot                        | Tief   | ✅ Kontext-Injection, Product Recommendations      |
| Auto-Translate                 | Mittel | ✅ Funktioniert über AI                            |
| Product Categorization         | ❌     | Fehlt                                              |
| Fraud Detection                | ❌     | Fehlt                                              |
| Dynamic Pricing                | ❌     | Fehlt                                              |
| Image Generation/Enhancement   | ❌     | Fehlt                                              |

**Gesamt:** Die AI ist tiefer integriert als bei jedem Konkurrenten (Medusa, Vendure, Saleor haben KEIN eingebautes AI). Das ist der echte USP.

### 14.8 Tests

**Gibt es welche? Coverage?**

**Nein.** Es gibt **KEINE Tests**. Kein einziger Test in 64.000 Zeilen Code.

- Keine Unit Tests
- Keine Integration Tests
- Keine E2E Tests
- Kein Test Framework konfiguriert (kein vitest.config, kein jest.config)
- Keine Test-Utilities

**Das ist das größte Problem des gesamten Projekts.**

Ohne Tests ist:

- Refactoring gefährlich
- Plugin-Entwicklung ein Ratespiel
- CI/CD nur Syntax-Check, kein Behavior-Check
- Production-Deployment ein Risiko

### 14.9 Dokumentation

| Dokument              | Qualität                                    |
| --------------------- | ------------------------------------------- |
| README.md             | ✅ Gut — Setup, Features, Tech Stack        |
| ARCHITECTURE.md       | ✅ Sehr gut — Detailliert, mit Konventionen |
| FEATURES.md           | ✅ Sehr gut — Vollständige Feature-Matrix   |
| API.md                | ✅ Sehr gut — Vollständige API-Referenz     |
| CONCEPT.md            | ✅ Gut — Vision und Philosophie             |
| PAGE_BUILDER_AUDIT.md | ✅ Gründlich                                |
| Plugin SDK Docs       | ❌ Fehlt                                    |
| Deployment Guide      | ❌ Fehlt                                    |
| Contributing Guide    | ❌ Fehlt                                    |
| User Documentation    | ❌ Fehlt                                    |

---

## 15. Verbesserungsvorschläge

### Quick Wins (< 1 Stunde) 🏃

| #   | Verbesserung                                             | Impact                        | Aufwand |
| --- | -------------------------------------------------------- | ----------------------------- | ------- |
| 1   | **Composite PK auf `product_categories`**                | Verhindert Daten-Inkonsistenz | 10 min  |
| 2   | **Index auf `product_translations(product_id, locale)`** | Performance                   | 5 min   |
| 3   | **Index auf `search_logs(created_at)`**                  | Analytics Performance         | 5 min   |
| 4   | **GIN Index auf `product_variants.attributes`**          | Attribut-Suche Performance    | 5 min   |
| 5   | **`CHECK (price >= 0)` Constraint**                      | Data Integrity                | 10 min  |
| 6   | **`.nvmrc` mit Node 22**                                 | DX / Contributor Onboarding   | 2 min   |
| 7   | **`engines` in root `package.json`**                     | Enforced Node Version         | 2 min   |
| 8   | **Feature Flag für `demo-complete` Endpoint**            | Security                      | 20 min  |
| 9   | **Structured Data (JSON-LD) für Produktseiten**          | SEO                           | 45 min  |
| 10  | **`CONTRIBUTING.md`**                                    | Community                     | 30 min  |

### Medium Effort (1 Tag) 📅

| #   | Verbesserung                                     | Impact                     | Aufwand |
| --- | ------------------------------------------------ | -------------------------- | ------- |
| 1   | **Vitest Setup + 20 Core Service Tests**         | Code Confidence            | 1 Tag   |
| 2   | **Order State Machine** mit erlaubten Übergängen | Business Logic Correctness | 4-6h    |
| 3   | **Cart Expiration + Merge bei Login**            | Conversion Rate            | 4-6h    |
| 4   | **Guest Checkout**                               | Conversion Rate (+20-30%)  | 4-6h    |
| 5   | **OpenAPI Spec Generation** (Hono Zod OpenAPI)   | DX, API Explorer           | 6-8h    |
| 6   | **HTTP Cache Headers** auf API Responses         | Performance                | 4h      |
| 7   | **Soft Delete für Products + Orders**            | EU Compliance              | 4-6h    |
| 8   | **Cookie Consent Banner** (Storefront)           | GDPR Compliance            | 2-3h    |
| 9   | **Admin Dashboard Charts** (Revenue Graph)       | Admin UX                   | 4h      |
| 10  | **ISR für Produktseiten**                        | Storefront Performance     | 4h      |

### Big Tickets (1 Woche+) 🎯

| #   | Verbesserung                                                | Impact                    | Aufwand    |
| --- | ----------------------------------------------------------- | ------------------------- | ---------- |
| 1   | **Comprehensive Test Suite** (Unit + Integration + E2E)     | Production Readiness      | 2-3 Wochen |
| 2   | **Elasticsearch/Meilisearch Integration**                   | Search @ Scale            | 1-2 Wochen |
| 3   | **Redis für Rate Limiting + Token Blacklist + Cache**       | Horizontal Scaling        | 1 Woche    |
| 4   | **Email Queue** (Bull/BullMQ)                               | Reliability + Performance | 1 Woche    |
| 5   | **Einen Marketplace Plugin komplett implementieren** (eBay) | Credibility               | 2-3 Wochen |
| 6   | **Plugin Sandboxing** (V8 Isolates)                         | Security                  | 2-3 Wochen |
| 7   | **Faceted Search**                                          | E-Commerce Standard       | 1-2 Wochen |
| 8   | **Abandoned Cart Recovery**                                 | Revenue                   | 1 Woche    |
| 9   | **Multi-Store / Multi-Tenant**                              | Enterprise Feature        | 3-4 Wochen |
| 10  | **Webhook System** (ähnlich Shopify Webhooks)               | Integration Ecosystem     | 1-2 Wochen |

### Priorität nach Impact

```
🔴 KRITISCH (vor Production Launch):
1. Tests (zumindest Core Services + Payment Flow)
2. Guest Checkout
3. Soft Delete für Orders (EU Compliance)
4. Feature Flag für demo-complete
5. Cookie Consent

🟡 HOCH (innerhalb 1 Monat):
6. Redis für Caching/Rate Limiting
7. Email Queue
8. Order State Machine
9. Cart Expiration/Merge
10. Structured Data (SEO)

🟢 MITTEL (Roadmap):
11. Elasticsearch/Meilisearch
12. OpenAPI Spec
13. Ein kompletter Marketplace Plugin
14. Faceted Search
15. Abandoned Cart Recovery
```

---

## 16. Marktvergleich

### ForkCart vs. Medusa.js v2

| Aspekt               | ForkCart                   | Medusa.js v2             |
| -------------------- | -------------------------- | ------------------------ |
| **Alter**            | ~2 Monate                  | ~3 Jahre                 |
| **Stars**            | Neu                        | 26k+                     |
| **Architektur**      | Hono + Drizzle             | Express + MikroORM       |
| **Admin**            | Next.js (custom)           | Custom Dashboard         |
| **Plugin System**    | Sehr gut (WordPress-style) | Gut (Module-based)       |
| **AI**               | ✅ Eingebaut (USP!)        | ❌ Nicht vorhanden       |
| **Search**           | ✅ Smart Ranking + AI      | Basic (+ Algolia Plugin) |
| **Page Builder**     | ✅ Craft.js                | ❌ Nicht vorhanden       |
| **Marketplace**      | Skeleton                   | Nicht vorhanden          |
| **Mobile App**       | Proof of Concept           | Nicht vorhanden          |
| **Tests**            | ❌ Keine                   | ✅ Comprehensive         |
| **Docs**             | Gut (intern)               | ✅ Excellent             |
| **Community**        | Keine                      | Groß + aktiv             |
| **Production Ready** | Nein                       | Ja (v2 stable)           |

### ForkCart vs. Vendure

| Aspekt            | ForkCart             | Vendure                    |
| ----------------- | -------------------- | -------------------------- |
| **Framework**     | Hono (lightweight)   | NestJS (heavyweight)       |
| **DB**            | PostgreSQL + Drizzle | PostgreSQL/MySQL + TypeORM |
| **Admin**         | Next.js + shadcn     | Angular (custom)           |
| **GraphQL**       | ❌ REST only         | ✅ GraphQL native          |
| **Plugin System** | Event + Filter       | NestJS Module              |
| **AI**            | ✅ Eingebaut         | ❌                         |
| **Performance**   | Schneller (Hono)     | Langsamer (NestJS)         |
| **Enterprise**    | Nicht bereit         | Production-ready           |

### ForkCart vs. Saleor

| Aspekt           | ForkCart     | Saleor              |
| ---------------- | ------------ | ------------------- |
| **Sprache**      | TypeScript   | Python (Django)     |
| **API**          | REST         | GraphQL             |
| **Admin**        | Eingebaut    | Saleor Dashboard    |
| **AI**           | ✅ Eingebaut | ❌                  |
| **Cloud**        | Self-hosted  | Cloud + Self-hosted |
| **Multi-tenant** | ❌           | ✅                  |

### ForkCart vs. Shopware 6

| Aspekt            | ForkCart     | Shopware 6              |
| ----------------- | ------------ | ----------------------- |
| **Sprache**       | TypeScript   | PHP (Symfony)           |
| **Admin**         | Next.js      | Vue.js (custom)         |
| **Plugin System** | Sehr ähnlich | ✅ Mature               |
| **Marketplace**   | Skeleton     | ✅ Real integrations    |
| **Enterprise**    | Nein         | Ja (B2B, Multi-channel) |
| **DX**            | ✅ Modern    | Komplex                 |
| **AI**            | ✅ Eingebaut | ✅ (AI Copilot, später) |

### Was ist der echte USP?

1. **AI-Native** — Kein anderes Open-Source E-Commerce System hat AI als First-Class Feature:
   - AI Search Enhancement
   - AI Product Descriptions
   - AI Chatbot mit Product Recommendations
   - AI Auto-Translation
2. **Modern TypeScript Stack** — Hono + Drizzle + Next.js 15 ist der modernste Stack im E-Commerce Space. Leichtgewichtig, schnell, Typ-sicher.

3. **Page Builder** — Craft.js Drag & Drop im Admin, Zero-JS Rendering im Storefront. Das hat kein anderer.

4. **Plugin System mit WordPress DX** — Hooks + Filters ist ein bewährtes Pattern das jeder versteht.

5. **Marketplace Integration Vision** — Multi-Channel (Amazon, eBay, Otto, Kaufland) als Plugin ist eine starke Vision (wenn implementiert).

### Was fehlt für Production-Readiness?

```
🔴 BLOCKER:
├── Tests (min. Payment Flow + Order Creation)
├── Guest Checkout
├── Soft Delete (EU Compliance)
├── Cookie Consent
└── Rate Limiting auf Redis (nicht In-Memory)

🟡 SHOULD-HAVE:
├── Email Queue (Reliability)
├── Order State Machine
├── Structured Data (SEO)
├── Error Monitoring (Sentry Integration)
└── Logging Infrastructure (nicht nur console.log)

🟢 NICE-TO-HAVE:
├── Elasticsearch für Search
├── CDN Integration für Media
├── Multi-Language Admin
└── API Documentation (Swagger/OpenAPI)
```

---

## Fazit

ForkCart ist ein **beeindruckend ambitioniertes Projekt** das in kurzer Zeit eine enorme Feature-Breite erreicht hat. Die Architektur ist clean, die Code-Qualität ist hoch (TypeScript strict, gute Patterns, saubere Separation), und es gibt echte Differenzierungsmerkmale die kein anderes Open-Source E-Commerce System bietet.

**Die Stärken:**

- AI-Native Architektur (einzigartig)
- Plugin System auf Enterprise-Level
- Smart Search mit Ranking Algorithmus
- Page Builder (Craft.js)
- Moderne, leichtgewichtige Tech-Wahl (Hono > Express/NestJS)
- Clean Architecture mit Repository Pattern
- Durchdachtes Tax System
- Security Audit bereits durchgeführt

**Die Schwächen:**

- Keine Tests (größtes Risiko)
- Marketplace Plugins sind Shells
- Mobile App ist ein Proof of Concept
- i18n ist unvollständig
- Einige Performance-Patterns skalieren nicht
- Kein Guest Checkout (Conversion-Killer)
- Scheduled Task Registry ohne Engine

**Gesamtbewertung nach Packages:**

| Package             | Note   | Kommentar                                          |
| ------------------- | ------ | -------------------------------------------------- |
| database            | 8/10   | Solide Schemas, gute Indizes, fehlende Constraints |
| shared              | 8/10   | Sauber, DRY, gute Error Classes                    |
| core                | 8.5/10 | Bestes Package — Search + Plugins sind exzellent   |
| api                 | 8/10   | Sauber, konsistent, gute Middleware                |
| admin               | 7.5/10 | Vollständig, Page Builder top, Details fehlen      |
| storefront          | 7.5/10 | Funktional, gutes SSR, SEO-Details fehlen          |
| ai                  | 6.5/10 | Grundlage da, Tiefe fehlt                          |
| i18n                | 5.5/10 | Mehr Fassade als Lösung                            |
| plugin-sdk          | 8/10   | Sehr durchdacht, Docs fehlen                       |
| plugins/stripe      | 7/10   | Funktional, basic                                  |
| plugins/marketplace | 3/10   | Nur Skeletons                                      |
| mobile              | 4/10   | Proof of Concept                                   |
| cli                 | 5/10   | Minimal                                            |

**Empfehlung:** Fokus auf Tests, Guest Checkout, und einen vollständigen Marketplace Plugin. Dann ist ForkCart in einer Liga mit Medusa.js — mit besserer AI und modernerem Stack.

---

_Analyse abgeschlossen. 64.000 Zeilen Code gelesen. Kein File ungesehen. Brutal ehrlich, wie gewünscht._ 🦞
