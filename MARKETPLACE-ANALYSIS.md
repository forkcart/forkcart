# ForkCart Marketplace & Plugin-System — Analyse

> Erstellt: 2026-03-20 | Biene 🐝 im Auftrag von Nyx 🦞

---

## 1. Plugin-System Übersicht

ForkCart hat ein **ausgereiftes, WordPress-inspiriertes Plugin-System** mit zwei Formaten:

- **SDK-Style** (neu, bevorzugt): Plugins nutzen `@forkcart/plugin-sdk` und `definePlugin()`
- **Legacy-Style**: Direkte `registerDefinition()` mit Factory-Pattern (`createProvider()`)

### Installation / Aktivierung / Deaktivierung

| Aktion              | Mechanismus                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Install**         | `pnpm add <packageName>` via `PluginLoader.installPlugin()` — dynamisches `import()`, dann DB-Eintrag                                                                                 |
| **Discover**        | Scannt `node_modules/` nach `forkcart-plugin-*` und `@forkcart/plugin-*` Packages (oder `forkcart-plugin` keyword in package.json)                                                    |
| **Activate**        | `PluginLoader.activatePlugin()` → Settings aus DB lesen → Secrets entschlüsseln → `onActivate()` aufrufen → Hooks/Filters/Provider registrieren → `plugin:activated` Event emittieren |
| **Deactivate**      | `PluginLoader.deactivatePlugin()` → `onDeactivate()` aufrufen → Hooks/Filters/Slots/CLI/Tasks deregistrieren → Provider aus Registries entfernen → `plugin:deactivated` Event         |
| **Uninstall**       | Deactivate → `pnpm remove <packageName>` → Plugin aus Memory entfernen                                                                                                                |
| **Settings Update** | Secrets werden verschlüsselt gespeichert → Bei Änderung: Deactivate + Reactivate                                                                                                      |

### Startup-Flow

```
App Start → Alle bekannten Definitionen in DB sicherstellen (ensurePluginInDb)
          → Alle aktiven Plugins laden (loadActivePlugins)
          → Für jeden: Settings entschlüsseln → SDK/Legacy activate → Provider bridges registrieren
          → PluginScheduler starten → Cron-Jobs registrieren
```

---

## 2. Marketplace-Aufbau

### API-Routes (`/api/v1/marketplace/`)

| Endpoint                | Methode | Funktion                                                  |
| ----------------------- | ------- | --------------------------------------------------------- |
| `/connections`          | GET     | Alle Marketplace-Verbindungen auflisten                   |
| `/connections`          | POST    | Neue Verbindung erstellen (marketplaceId, name, settings) |
| `/connections/:id`      | DELETE  | Verbindung löschen                                        |
| `/connections/:id/test` | POST    | Verbindung testen (ruft `provider.testConnection()`)      |
| `/listings`             | GET     | Alle Listings auflisten (Filter: marketplaceId, status)   |
| `/sync/products`        | POST    | Produkte zum Marketplace pushen                           |
| `/sync/orders`          | POST    | Bestellungen vom Marketplace importieren                  |
| `/sync/inventory`       | POST    | Bestand synchronisieren                                   |
| `/sync-logs`            | GET     | Sync-History auflisten                                    |

### Frontend (Admin UI: `/marketplace`)

Vollständige Admin-Seite mit:

- **Connection Cards**: Status (connected/disconnected/error), Listing-Count, Last Sync
- **Action Buttons**: Test, Sync Products, Import Orders, Sync Inventory, Remove
- **Connect Modal**: Marketplace auswählen (nur aktive Marketplace-Plugins), API Key/Secret/Seller ID eingeben
- **Listings Table**: Marketplace, External ID, Status, Last Synced, Link
- **Sync History Table**: Time, Marketplace, Action, Status, Details

### Backend: `MarketplaceService`

Zentrale Service-Klasse die alles orchestriert:

- **Connections**: CRUD für Marketplace-Verbindungen (DB: `marketplace_connections`)
- **Product Sync**: Iteriert über aktive Produkte → `provider.listProduct()` / `provider.updateListing()`
- **Order Import**: `provider.fetchOrders()` → Deduplizierung → DB-Eintrag (`marketplace_orders`)
- **Inventory Sync**: Alle Listings laden → Produkt-Bestand lesen → `provider.bulkUpdateInventory()`
- Jede Operation wird in `marketplace_sync_logs` geloggt

### Plugin-Registry: `MarketplaceProviderRegistry`

Einfache `Map<string, MarketplaceProvider>` mit `register()`, `unregister()`, `get()`, `getAll()`.
Plugins registrieren sich hier bei Aktivierung — der MarketplaceService nutzt die Registry um den richtigen Provider zu finden.

---

## 3. Vorhandene Plugins

| Plugin                   | Type        | Version | Beschreibung                                                              |
| ------------------------ | ----------- | ------- | ------------------------------------------------------------------------- |
| **stripe**               | payment     | 0.1.0   | Stripe Payments (Credit Cards, Apple Pay, Google Pay, SEPA, 40+ Methoden) |
| **mailgun**              | email       | 0.1.0   | E-Mail via Mailgun API                                                    |
| **smtp**                 | email       | 0.1.0   | E-Mail via beliebigen SMTP-Server                                         |
| **marketplace-amazon**   | marketplace | 0.1.0   | Amazon SP-API (Products, Orders, Inventory)                               |
| **marketplace-ebay**     | marketplace | 0.1.0   | eBay Integration                                                          |
| **marketplace-kaufland** | marketplace | 0.1.0   | Kaufland Marketplace                                                      |
| **marketplace-otto**     | marketplace | 0.1.0   | OTTO Marketplace                                                          |

Alle Plugins sind im **SDK-Style** geschrieben und nutzen `definePlugin()`.

---

## 4. Plugin-Laden & Registrierung

### Discovery-Mechanismus

```
node_modules/
├── forkcart-plugin-*        → Wird entdeckt
├── @forkcart/
│   └── plugin-*             → Wird entdeckt
└── beliebiges-package/
    └── package.json mit keyword "forkcart-plugin" → Wird entdeckt
```

### Registration Flow

1. **Dynamic Import**: `await import(packageName)` → Default-Export = `PluginDefinition`
2. **SDK Registration**: `registerSdkPlugin(def)` → Speichert in `sdkPlugins` Map
3. **Schema Storage**: Settings-Schema wird für Secret-Detection gespeichert
4. **Permission Registration**: Deklarierte Permissions werden registriert
5. **DB Sync**: `ensurePluginInDb()` → Upsert in `plugins` Tabelle

### Provider Bridging (SDK → Core Registries)

Das System überbrückt SDK-Provider zu den bestehenden Core-Registries:

- `payment` → `PaymentProviderRegistry` (via `createPaymentProviderBridge`)
- `email` → `EmailProviderRegistry` (via `createEmailProviderBridge`)
- `marketplace` → `MarketplaceProviderRegistry` (via `createMarketplaceProviderBridge`)

Die Bridges wrappen die SDK-Provider-Methoden in die Core-Interfaces.

---

## 5. Plugin SDK (`@forkcart/plugin-sdk`)

### Exports

- `definePlugin()` — Hauptfunktion für Plugin-Autoren
- **Types**: `PluginDefinition`, `PluginType`, `PluginPermission`, `PluginSettingsMap`, `ResolvedSettings`, `PluginContext`, etc.
- **Events**: `DomainEvent`, `PluginEventMap`, `PLUGIN_EVENTS` (20 Event-Types)
- **Provider Interfaces**: `PaymentProviderMethods`, `MarketplaceProviderMethods`, `EmailProviderMethods`, `ShippingProviderMethods`

### Plugin-Capabilities

Ein Plugin kann definieren:

| Feature              | Feld                                                                 | Beschreibung                                                                          |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Settings**         | `settings`                                                           | Typed Schema (string/number/boolean/select), secret support, defaults                 |
| **Lifecycle Hooks**  | `onActivate`, `onDeactivate`, `onInstall`, `onUninstall`, `onUpdate` | Context mit settings, db, logger, eventBus                                            |
| **Event Hooks**      | `hooks`                                                              | Reagiert auf Domain-Events (order:created, product:updated, etc.)                     |
| **Filters**          | `filters`                                                            | Data Transformation (product:price, cart:total, search:results, etc.)                 |
| **Provider**         | `provider`                                                           | Business-Logik (Payment/Email/Marketplace/Shipping Methoden)                          |
| **Admin Pages**      | `adminPages`                                                         | Eigene Seiten im Admin-Panel                                                          |
| **Custom Routes**    | `routes`                                                             | HTTP-Endpoints unter `/api/v1/plugins/<name>/`                                        |
| **Storefront Slots** | `storefrontSlots`                                                    | HTML-Injektion in 16 Frontend-Positionen (head, footer, product-page, checkout, etc.) |
| **DB Migrations**    | `migrations`                                                         | Eigene Tabellen anlegen/verwalten                                                     |
| **CLI Commands**     | `cli`                                                                | `forkcart plugin:<name>:<command>`                                                    |
| **Scheduled Tasks**  | `scheduledTasks`                                                     | Cron-Jobs mit node-cron                                                               |
| **Dependencies**     | `dependencies`                                                       | Andere Plugins die installiert sein müssen                                            |
| **Permissions**      | `permissions`                                                        | 17 Permission-Types (orders:read, payments:process, admin:full, etc.)                 |

---

## 6. Plugin-Architektur im Detail

### Lifecycle

```
Install → ensurePluginInDb (inactive)
       → Activate → onActivate(ctx)
                   → Register hooks, filters, slots, CLI, tasks
                   → Bridge provider to registry
                   → DB: isActive = true
                   → Emit plugin:activated
       → Deactivate → onDeactivate(ctx)
                     → Unregister everything
                     → DB: isActive = false
                     → Emit plugin:deactivated
       → Uninstall → Deactivate first
                    → pnpm remove
                    → Remove from memory
```

### Context (was Plugins bekommen)

```typescript
{
  settings: ResolvedSettings<TSettings>,  // Typed, entschlüsselt
  db: Database,                           // ⚠️ Raw Drizzle Handle (Security Warning!)
  logger: PluginLogger,                   // Scoped Logger (debug/info/warn/error)
  eventBus: PluginEventBus,               // on/off/emit
}
```

### Event System

- **EventBus**: In-Process, async, fire-and-forget (`Promise.allSettled`)
- **20 Event-Types**: Orders, Products, Cart, Customer, Checkout, Inventory, Plugin Lifecycle
- **Typed**: `PluginEventMap` mappt Event-Name → Payload-Type
- Handler-Fehler werden geloggt aber schlucken nicht andere Handler

### Filter System (WordPress-Style)

- **15 Filter-Names**: product:price, cart:total, checkout:payment-methods, search:results, admin:menu, storefront:head, etc.
- Priorität-basiert (niedrigere Zahl = früher)
- Fehlertolerant: Bei Error wird unmodifizierter Wert zurückgegeben

### Scheduler

- **node-cron** basiert
- Tasks werden bei Plugin-Aktivierung registriert, bei Deaktivierung entfernt
- API: getAllTasks(), runTask(), toggleTask()
- State-Tracking: lastRun, lastError, runCount

### Secret Management

- Settings mit `secret: true` werden mit `encryptSecret()` verschlüsselt in DB gespeichert
- Bei Aktivierung: `decryptSecret()` bevor Settings an Plugin übergeben werden
- Admin API: Secrets werden als `••••••••` angezeigt
- `isEncrypted()` Check verhindert Doppel-Verschlüsselung

---

## 7. Stripe Integration (Beispiel-Plugin)

### Architektur

```
packages/plugins/stripe/
├── src/
│   ├── index.ts      → definePlugin() mit Settings & Provider
│   └── provider.ts   → StripePaymentProvider (implementiert PaymentProvider Interface)
└── package.json      → @forkcart/plugin-sdk als Dependency
```

### Provider-Implementierung

- **Initialize**: Stripe SDK lazy-loaden mit `await import('stripe')`, Instance erstellen
- **createPaymentIntent**: Stripe Customer erstellen → PaymentIntent mit `automatic_payment_methods` → clientSecret zurückgeben
- **verifyWebhook**: Signatur-Verifizierung (Production: Pflicht, Dev: Optional) → Event-Mapping (payment_intent.succeeded → payment.succeeded)
- **getPaymentStatus**: PaymentIntent abrufen → Status-Mapping (Stripe-Status → ForkCart-Status)
- **Security**: Webhook-Secret wird erzwungen in Production (RVS-026)

### Settings

| Key            | Type   | Secret | Required |
| -------------- | ------ | ------ | -------- |
| secretKey      | string | ✅     | ✅       |
| publishableKey | string | ❌     | ✅       |
| webhookSecret  | string | ✅     | ❌       |

### Client-Config

```json
{
  "provider": "stripe",
  "displayName": "Stripe",
  "componentType": "stripe-payment-element",
  "clientConfig": { "publishableKey": "pk_..." }
}
```

---

## 8. Admin UI für Plugins

### Plugin-Liste (`/plugins`)

- Zeigt alle Plugins mit: Name, Version, Type-Badge, Status (Active/Inactive), Author, Description
- Source-Indikator (SDK/Legacy)
- Aktivierung/Deaktivierung Toggle pro Plugin

### Plugin-Detail (`/plugins/[id]`)

- **Header**: Icon (typ-basiert), Name, Version, Type-Badge, Active/Inactive Toggle, Uninstall Button
- **Settings-Formular**: Dynamisch generiert aus `settingsSchema`
  - String-Felder (mit Secret-Toggle Eye-Icon für Passwörter)
  - Number-Felder (mit min/max)
  - Boolean-Felder (Toggle Switch)
  - Select-Felder (Dropdown)
  - Placeholder für konfigurierte Secrets: "(configured — enter new value to change)"
- **Save Button** mit Loading-State
- **Info-Sektion**: Source, Installed Date, Version, Type
- **Uninstall Modal**: Bestätigungs-Dialog mit Warnung

### Marketplace-Seite (`/marketplace`)

Siehe Abschnitt 2 — vollständige Connection-Management UI.

### Scheduled Tasks API

- `GET /plugins/tasks` — Alle Tasks auflisten
- `POST /plugins/tasks/:taskKey/run` — Task manuell ausführen
- `PUT /plugins/tasks/:taskKey/toggle` — Task aktivieren/deaktivieren

---

## 9. Database-Schema

### Plugin-Tabellen

```
plugins (id, name, version, description, author, is_active, entry_point, metadata, installed_at, updated_at)
plugin_settings (id, plugin_id FK, key, value JSONB, created_at, updated_at)
```

### Marketplace-Tabellen

```
marketplace_connections (id, marketplace_id, name, settings JSONB, status, last_sync_at, created_at, updated_at)
marketplace_listings (id, product_id FK, marketplace_id, external_id, external_url, status, synced_at, created_at, updated_at)
marketplace_orders (id, external_id, marketplace_id, order_data JSONB, forkcart_order_id FK, imported_at, created_at)
marketplace_category_mappings (id, category_id FK, marketplace_id, external_category_id, external_category_name, created_at)
marketplace_sync_logs (id, marketplace_id, action, status, details JSONB, created_at)
```

Alle mit sinnvollen Indexes und Unique-Constraints.

---

## 10. Was fehlt / Verbesserungsvorschläge

### 🔴 Kritisch

1. **Security: Raw DB-Handle an Plugins**
   - Plugins bekommen `db: Database` — uneingeschränkter Zugriff auf ALLE Tabellen
   - Ein kompromittiertes Plugin kann Customer-PII, Zahlungsdaten, Admin-Credentials lesen
   - **Lösung**: Scoped DB Proxy mit Row-Level Security, Plugin-spezifische Tables, Query-Audit-Log

2. **Kein Plugin-Sandboxing**
   - Plugins laufen im gleichen Node.js Prozess — ein crashendes Plugin kann die ganze App runterreißen
   - Kein Memory/CPU-Limit pro Plugin
   - **Lösung**: Worker Threads oder isolierte Prozesse für Plugin-Code

3. **Marketplace Connection Settings unverschlüsselt**
   - `marketplace_connections.settings` speichert API Keys als Plain JSONB
   - Plugin-Settings werden verschlüsselt, aber Marketplace-Connection-Settings nicht
   - **Lösung**: Gleiche `encryptSecret()`/`decryptSecret()` Logik anwenden

### 🟡 Wichtig

4. **Kein Plugin-Versioning/Rollback**
   - `onUpdate(ctx, fromVersion)` existiert im SDK, wird aber nirgends aufgerufen
   - Kein Migrations-Runner für Plugin-Migrations (nur im Type definiert, nicht implementiert)
   - **Lösung**: Migration-Runner implementieren, Version-Tracking, Rollback-Support

5. **Kein echtes Marketplace (Plugin Store)**
   - Aktuell: Plugins kommen nur aus npm (`pnpm add`)
   - Es fehlt: Browseable Plugin-Katalog, Bewertungen, Featured Plugins, One-Click Install
   - **Lösung**: ForkCart Plugin Registry API + Admin UI mit Kategorie-Filter, Search, Install-Button

6. **Dependency Resolution nicht implementiert**
   - `dependencies` Feld existiert im SDK, wird aber nicht validiert
   - Ein Plugin kann aktiviert werden ohne dass seine Dependencies aktiv sind
   - **Lösung**: Dependency-Check bei Aktivierung, Warnung/Block bei fehlenden Dependencies

7. **Admin Pages nicht gerendert**
   - `adminPages` wird in der Plugin-Definition akzeptiert und in der API zurückgegeben
   - Aber es gibt keinen Router/Renderer der diese Seiten im Admin-Panel anzeigt
   - **Lösung**: Dynamic Route-Generation im Admin-Frontend basierend auf registrierten adminPages

8. **Custom Routes nicht gemountet**
   - `routes` Feld akzeptiert eine Router-Funktion, aber es gibt keinen Code der diese Routes mountet
   - **Lösung**: In der API-App: Für jedes aktive Plugin mit `routes` einen Sub-Router unter `/api/v1/plugins/<name>/` mounten

### 🟢 Nice-to-have

9. **Plugin-Marketplace-Provider sind Stubs**
   - Amazon, eBay, OTTO, Kaufland Provider existieren, aber die API-Calls sind wahrscheinlich TODO
   - **Lösung**: Echte API-Integrationen implementieren (Amazon SP-API, eBay REST API, etc.)

10. **Kein Plugin Hot-Reload**
    - Plugins können nur über API aktiviert/deaktiviert werden → Server-Restart bei Code-Änderungen
    - **Lösung**: File-Watcher für Development, Hot Module Replacement für Plugin-Code

11. **Storefront Slots: Nur String-Content**
    - Slots injizieren Plain HTML strings — keine React-Components
    - **Lösung**: Remote Component Loading oder Script-Tag-basierte Widget-Injection

12. **Kein Rate-Limiting pro Plugin**
    - Plugins können beliebig viele API-Calls, DB-Queries, Events emittieren
    - **Lösung**: Per-Plugin Rate Limits für DB-Operations und Event-Emissions

13. **Filter-System nicht überall angebunden**
    - 15 Filter definiert, aber es fehlt Code der `applyFilters()` an den richtigen Stellen aufruft
    - **Lösung**: In Product-Service, Cart-Service, Checkout-Flow etc. `pluginLoader.applyFilters()` integrieren

14. **Kein Health-Check pro Plugin**
    - Keine Möglichkeit den Status eines Plugins zu prüfen (connected, healthy, error)
    - **Lösung**: `healthCheck()` Methode im PluginContext

15. **Marketplace: Kein Webhook-Empfang**
    - Orders werden nur per Pull (`importOrders`) geholt, kein Push von Marktplätzen
    - **Lösung**: Marketplace-spezifische Webhook-Endpoints (`/webhooks/amazon`, `/webhooks/ebay`)

---

## Zusammenfassung

ForkCart hat ein **überraschend vollständiges Plugin-System** für ein junges Projekt:

✅ **Stark:**

- SDK mit `definePlugin()` + TypeScript-Support
- 7 Plugins implementiert (Payment, Email, 4× Marketplace)
- Event-System mit 20 typed Events
- Filter-System (WordPress apply_filters Style)
- Secret-Verschlüsselung für Plugin-Settings
- Storefront Slots (16 Positionen)
- Scheduler mit Cron-Support
- Permission-System (17 Permissions)
- CLI-Commands Registration
- Admin UI mit dynamischem Settings-Formular
- Provider-Bridge-Pattern (SDK → Core Registries)

⚠️ **Lücken:**

- Security (Raw DB, kein Sandboxing, unverschlüsselte Marketplace-Settings)
- Fehlende Implementierungen (Plugin Migrations, Admin Pages Rendering, Custom Routes Mounting, Filter Integration)
- Kein Plugin Store/Registry (nur npm-basiert)
- Dependency Resolution nicht implementiert

**Gesamtbewertung: Solide Architektur, braucht noch Hardening und Feature-Completion.**
Die Grundlagen sind da — es fehlt hauptsächlich an der letzten Meile: Security-Härtung, tatsächliche API-Integrationen für Marketplace-Provider, und ein browseable Plugin-Store im Admin.
