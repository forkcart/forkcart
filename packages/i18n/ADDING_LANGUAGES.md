# Adding a New Language to ForkCart

## Option A: Via Admin Panel (No Code)

1. Go to **Admin → Settings → Translations**
2. Click **"Add Language"**
3. Enter the locale code (e.g. `fr` for French)
4. Translate the strings inline, or import a JSON file
5. Click **Save**

That's it. The LanguageSwitcher shows the new language automatically.

## Option B: Via JSON File (For Developers / Contributors)

### 3 Steps:

1. **Copy** `packages/i18n/locales/en.json` → `packages/i18n/locales/fr.json`
2. **Translate** all the values (keep the keys unchanged!)
3. **Done.** Run `pnpm --filter @forkcart/i18n run build` and the language appears automatically.

### That's literally it.

No config files to edit. No imports to add. No code changes needed.

The build script scans `locales/` and auto-discovers every `*.json` file as a language.
The LanguageSwitcher dynamically shows all available locales.
Missing keys automatically fall back to English — users never see raw keys like `cart.empty`.

### For admin panel translations:

Same pattern — copy `admin-en.json` → `admin-fr.json` and translate.

## Locale Code Reference

Use standard [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) codes:

| Code | Language    | Native Name  |
|------|-------------|-------------|
| `en` | English     | English     |
| `de` | German      | Deutsch     |
| `fr` | French      | Français    |
| `es` | Spanish     | Español     |
| `it` | Italian     | Italiano    |
| `nl` | Dutch       | Nederlands  |
| `pt` | Portuguese  | Português   |
| `pl` | Polish      | Polski      |
| `tr` | Turkish     | Türkçe      |
| `ru` | Russian     | Русский     |
| `ja` | Japanese    | 日本語       |
| `zh` | Chinese     | 中文         |
| `ko` | Korean      | 한국어       |
| `ar` | Arabic      | العربية      |

Unknown locale codes will display as uppercase (e.g. `SW` for Swahili).

## Validation

During build, the script checks every locale against `en.json` and warns about missing keys:

```
⚠️  fr.json is missing 3 key(s):
   - checkout.secureCheckout
   - footer.copyright
   - errors.forbidden
```

Missing keys fall back to English at runtime — the shop still works perfectly.

## Hybrid: File Defaults + Admin Overrides

ForkCart uses a hybrid approach:
- **JSON files** = Default translations (shipped with code, version-controlled)
- **Database** = Admin overrides (editable via Admin Panel)
- At runtime: `{ ...jsonDefaults, ...dbOverrides }` — DB always wins

This means:
- Developers can contribute translations via PRs (JSON files)
- Shop owners can customize any string without touching code (Admin Panel)
- Both work together seamlessly
