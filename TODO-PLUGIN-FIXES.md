# Plugin System Fixes — Morning Session 28.03.2026

## 🔴 Must Fix

### 1. ScriptExecutor für StorefrontSlot + PluginBlockFallback

- `StorefrontSlot.tsx` und `PluginBlockFallback.tsx` rendern auch `<script>` Tags
- Gleicher Suspense-Bug wie bei PluginBlock — Scripts in hidden divs laufen nicht
- Fix: ScriptExecutor wie in plugin-block.tsx einbauen

### 2. Uninstall löscht Dateien nicht

- `uninstallPlugin()` entfernt nur aus DB
- Muss auch `data/plugins/<slug>/` rm -rf'en
- War im Bienen-Refactor drin aber checken ob es wirklich funktioniert

### 3. Store-Install: Display-Name vs Technical-Name

- Store schreibt `"Nyx Recommendations"` (Display) in plugins.name
- definePlugin hat `"nyx-recommendations"` (technical)
- Fix: Store-Install soll den `name` aus der Plugin-Definition nehmen, nicht vom Registry
- ODER: plugins DB Tabelle braucht separates `display_name` Feld

### 4. pnpm build nach Core-Änderungen

- dist/ wird von Node geladen, nicht Source
- Heute stundenlang debuggt weil dist stale war
- Fix: Pre-commit hook oder CI-Check der dist rebuild erzwingt
- Oder: API Service mit `tsx --watch` statt pre-compiled dist

## 🟡 Should Fix

### 5. Deduplicate /blocks Fetches

- Jeder PluginBlock fetcht `/blocks` separat
- In-Memory Cache hilft, aber besser: ein Fetch für alle Blocks pro Page
- Fix: Blocks-Daten in PageBuilder Renderer fetchen und als prop durchreichen

### 6. coreSchema: categories + product_categories

- Plugin hatte `category_id` auf products erwartet — gibt's nicht
- product_categories ist Zwischentabelle
- coreSchema muss das dokumentieren oder Helper bereitstellen

### 7. window.FORKCART für alle Page Types

- Aktuell nur productId auf Product Pages
- Brauchen: categoryId, cartId, orderId etc. auf entsprechenden Pages
- SSR-Script-Pattern von Product Page auf alle Pages ausweiten

## 🟢 Nice to Have

### 8. Plugin Dev CLI

- `npx forkcart plugin:dev` → watch + hot-reload + auto-esbuild

### 9. Plugin Preview/Sandbox

- Vor dem Publish im Store testen können

### 10. PLUGINS.md komplett neuschreiben

- Alle neuen Features dokumentieren
- Alle Gotchas die wir heute Nacht gefunden haben
- ScriptExecutor, SSR productId, data/plugins/ only, ref(), etc.
