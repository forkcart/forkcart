# Plugin System Review — Nyx 🦞 (28.03.2026)

## Gesamtbewertung: 🟢 Sehr solide Basis

7.411 Zeilen Code, 440 Zeilen Types, 2.400+ Zeilen Doku. Für ein System das in 2 Tagen gebaut wurde — beeindruckend. Aber es gibt Verbesserungspotential.

---

## ✅ Was richtig gut ist

1. **`definePlugin()` als Single Entry Point** — Alles in einer Funktion, TypeScript-strict, IDE-Autocomplete. Besser als Shopware (XML + PHP + Service Tags).

2. **ScopedDatabase** — Echtes Permission-System mit Rate Limiting + Slow Query Logging. Kein anderes OS E-Commerce System hat das.

3. **Storefront Slots + PageBuilder Blocks + Storefront Pages** — Drei Ebenen der Frontend-Erweiterung. Flexibel genug für alles.

4. **ScriptExecutor Pattern** — Löst ein echtes React/Suspense Problem das die meisten Plugin-Systeme ignorieren.

5. **Hot Reload + Plugin Dev CLI** — DX die Shopware-Devs neidisch machen würde.

6. **Migration Helpers (`ref()`, `coreSchema`)** — Verhindert den #1 Plugin-Bug (UUID vs VARCHAR).

---

## 🟡 Was verbessert werden sollte

### 1. Plugin CSS Isolation fehlt

**Problem:** Plugin-CSS kann Core-Styles überschreiben. Tytos Blog-Plugin injiziert `.post-title { font-size: 2.25rem }` — was wenn ein anderes Plugin auch `.post-title` hat?
**Fix:** CSS Scoping — entweder:

- Automatisches Prefixing: `.plugin-blog .post-title { ... }`
- Shadow DOM für Plugin-Slots
- CSS Modules Support im SDK

### 2. ~~Plugin Marketplace Search im Admin~~ ✅ EXISTIERT BEREITS

Marketplace mit Browse/Search/Install ist im Admin Panel vorhanden. Punkt zurückgezogen! 🐟

### 3. Plugin Settings sind flat — kein Grouping/Tabs

**Problem:** Ein Plugin mit 15 Settings wird ein langer Scroll. Kein Weg Settings in Gruppen/Tabs zu organisieren.
**Fix:** `settingsGroups` in der Plugin-Definition:

```ts
settingsGroups: [
  { label: 'General', keys: ['enabled', 'title'] },
  { label: 'Advanced', keys: ['cacheTime', 'debug'] },
];
```

### 4. Kein Plugin-to-Plugin Communication

**Problem:** Plugin A kann Plugin B nicht direkt ansprechen. Nur über Events (fire & forget).
**Fix:** `ctx.plugins.call('other-plugin', 'methodName', args)` — synchroner RPC zwischen Plugins.

### 5. Storefront Pages URL Prefix `/ext/` ist hässlich

**Problem:** `/ext/blog` statt `/blog`. Für Kunden verwirrend.
**Fix:** Konfigurierbare Prefixes oder gar kein Prefix (Plugin-Seiten in der Middleware als bekannte Pfade registrieren). Aber: Collision-Risk mit Core-Routen!

### 6. Kein Versioning/Rollback für Plugin-Daten

**Problem:** Plugin-Update kann Daten korrumpieren. Kein Weg zurück.
**Fix:**

- Automatic DB Backup vor Plugin-Update
- `down()` Migrations automatisch ausführen bei Rollback
- Plugin-Version History im Admin

### 7. Plugin-Events sind nicht typisiert

**Problem:** `hooks: { 'order:created': (event, ctx) => {} }` — `event.payload` ist `unknown`. Kein Autocomplete.
**Fix:** Generische Event-Types:

```ts
hooks: {
  'order:created': async (event: OrderCreatedEvent, ctx) => {
    event.payload.orderId // ← autocomplete!
  }
}
```

### 8. Kein Plugin Dependency Version Range

**Problem:** `dependencies: ['stripe']` prüft nur ob installiert, nicht welche Version.
**Fix:** `dependencies: { 'stripe': '^2.0.0' }` mit Semver-Range-Matching.

### 9. Storefront Slots sind hardcoded

**Problem:** `'product-page-bottom' | 'cart-page-top' | ...` — feste Liste. Custom Themes können keine eigenen Slots definieren.
**Fix:** Dynamic Slot Registry — Themes/Plugins können Slots registrieren:

```tsx
<StorefrontSlot slotName="my-custom-section" />
```

### 10. Kein Webhook-System für Plugins

**Problem:** Plugins können keine Webhooks empfangen (z.B. Stripe Webhooks, GitHub Events).
**Fix:** `/api/v1/webhooks/<plugin-slug>` Route die automatisch an das Plugin weitergeleitet wird, mit Signature-Verification Helpers im SDK.

---

## 🔴 Was fehlt (Feature Requests)

### ~~1. Plugin Marketplace im Admin~~ ✅ Existiert bereits!

### 2. Plugin Theming API

Plugins können Theme-Variablen nutzen (Farben, Fonts, Spacing) statt hardcoded CSS.

### 3. Multi-Language Support für Plugin-Content

Plugin-Strings (Labels, Descriptions, Admin UI) in i18n integrieren.

### 4. Plugin Analytics Dashboard

Zeigt pro Plugin: Query-Count, Response Times, Error Rate, Memory Usage.

### 5. A/B Testing für Plugins

"Aktiviere Plugin X für 50% der Besucher" — Feature Flags.

### 6. Plugin Sandbox/Security Audit

Automatische Analyse vor Installation: Welche Permissions? Welche External Calls? Welche DB Tables?

---

## 📊 Vergleich mit Konkurrenz

| Feature            | ForkCart       | Shopware 6    | WooCommerce      | Medusa      |
| ------------------ | -------------- | ------------- | ---------------- | ----------- |
| TypeScript SDK     | ✅ Full        | ❌ PHP        | ❌ PHP           | ✅ Partial  |
| Scoped DB          | ✅ Permissions | ❌ Raw access | ❌ Raw access    | ❌ None     |
| Hot Reload         | ✅ + CLI       | ❌            | ❌               | ❌          |
| Storefront Pages   | ✅ /ext/\*     | ✅ Routed     | ✅ Templates     | ❌ Headless |
| PageBuilder Blocks | ✅ Craft.js    | ✅ CMS        | ✅ Gutenberg     | ❌ None     |
| Plugin Store       | ✅ Built-in    | ✅ Mature     | ✅ wordpress.org | ❌ None     |
| CSS Isolation      | ❌             | ❌            | ❌               | N/A         |
| Event System       | ✅ + Filters   | ✅            | ✅               | ✅          |
| Migration Helpers  | ✅ ref()       | ❌            | ❌               | ❌          |
| Rate Limiting      | ✅ Per-plugin  | ❌            | ❌               | ❌          |

**ForkCart's Plugin System ist bereits besser als Medusa und auf Augenhöhe mit Shopware/WooCommerce — nach 2 Tagen.**

---

## 🎯 Priority: Was als nächstes?

1. **CSS Isolation** — verhindert Bugs, macht Plugins sicherer
2. **Typed Events** — bessere DX, weniger Bugs
3. **Admin Marketplace** — macht den Store benutzbar
4. **Plugin Settings Groups** — bessere UX bei komplexen Plugins
5. **/ext/ Prefix optional machen** — saubere URLs

---

_Reviewed by Nyx 🦞 — 28.03.2026, 23:00 UTC_
_Total Plugin System: ~7.400 LoC + 2.400 LoC Docs + 440 LoC Types_
