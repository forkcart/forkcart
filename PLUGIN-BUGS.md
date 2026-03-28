# Plugin System Bugs — Gefunden beim Blog-Plugin Test (28.03.2026)

## 🔴 Kritisch (Fixed)

### 1. Plugin-Routes nicht nach Live-Aktivierung gemounted

**Status:** ✅ FIXED (dynamischer Catch-All statt statisches Mounting)
**Problem:** `mountPluginRoutes()` nur beim API-Start → Plugins brauchten Server-Restart
**Fix:** Wildcard-Handler `/api/v1/public/plugins/:slug/*` mit Runtime-Lookup

### 2. Middleware behandelt `/ext/` als ungültigen Locale-Code

**Status:** ✅ FIXED
**Problem:** i18n Middleware matched `ext` als 3-Buchstaben Locale → 307 Redirect `/ext/blog` → `/blog`
**Fix:** Reserved-Prefixes-Liste (`ext`, `api`, `app`) von Locale-Detection ausgeschlossen

### 3. ScriptExecutor feuert vor DOM-Content

**Status:** ✅ FIXED
**Problem:** Plugin-Scripts versuchten `getElementById()` bevor HTML im DOM war → `null` Error
**Fix:** 50ms Delay im ScriptExecutor `useEffect`

### 4. Developer Portal gibt `version: null` zurück

**Status:** ✅ FIXED (in developer-portal)
**Problem:** `/store/:slug` Endpoint merged latest Version nicht ins Plugin-Objekt → Update-Check findet nichts
**Fix:** Latest approved Version aus `plugin_versions` joinen

### 5. Admin Plugin-Pages kennen API-URL nicht

**Status:** ✅ FIXED
**Problem:** Plugin-Scripts nutzen relative Pfade → gehen an Admin-Server statt API
**Fix:** `window.__FORKCART_API_URL` global in Admin Layout setzen

### 6. Doppelte Route-Registration (Plugin-Bug, nicht Core)

**Status:** ✅ FIXED (in Blog-Plugin)
**Problem:** `/storefront/blog-list` doppelt registriert — erst als JSON-API, dann als HTML-contentRoute. Hono nimmt die erste.
**Fix:** Alte JSON-Route umbenannt auf `/posts-data`

## 🔴 Kritisch (Offen)

### 7. Storefront Pages Wildcard-Matching (`/blog/*`)

**Problem:** `/ext/blog/tyto-die-eule` gibt 404 — die `path: '/blog/*'` Page wird nicht gematched
**Root Cause:** Die Catch-All Route `/ext/[...slug]` gibt `slug = ['blog', 'tyto-die-eule']` → pagePath = `/blog/tyto-die-eule`. Die API sucht nach einer Page mit exakt diesem Pfad, findet aber nur `/blog` und `/blog/*`. Wildcard-Matching fehlt im Page-Lookup.
**Fix nötig:** `getStorefrontPage()` im Plugin-Loader muss Wildcard-Patterns matchen

### 8. Plugin Store Version-Upload Error nicht benutzerfreundlich

**Problem:** Doppelte Version hochladen → "Internal server error" statt "Version 1.0.0 existiert bereits"
**Fix nötig:** Unique Constraint Error abfangen und 409 Conflict zurückgeben

## 🟡 Verbesserungen (Offen)

### 9. Plugin-Dateien (`data/plugins/`) nicht in `.gitignore`

**Problem:** Tytos Blog-Plugin wurde versehentlich ins Repo committed
**Fix:** `packages/api/data/plugins/` in `.gitignore` (schon in `.prettierignore`)

### 10. Kein Auto-Deploy nach Git Push

**Problem:** Jeder Push braucht manuelles `pnpm build && systemctl restart`
**Idee:** Post-push Hook oder CI/CD

### 11. `data/plugins/` verschachtelte Ordner

**Problem:** ZIP-Extraktion erzeugt `blog/forkcart-plugin-blog/` — doppelt genested
**Status:** Plugin Loader handled das, aber verwirrend für Entwickler
