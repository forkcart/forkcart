# ForkCart — Feature Checklist

## Legende

- ✅ Done — funktioniert
- 🟡 Schema da — DB-Tabelle existiert, aber kein API/UI
- ❌ Fehlt — muss gebaut werden

---

## 1. Produkte & Katalog

| Feature                     | Status | Details                                       |
| --------------------------- | ------ | --------------------------------------------- |
| Produkte CRUD               | ✅     | API + Admin UI                                |
| Produkt-Liste (Admin)       | ✅     | Mit Status, Preis, SKU                        |
| Produkt-Detail/Edit (Admin) | ✅     | Form mit allen Feldern                        |
| Produktvarianten            | 🟡     | Schema da, kein UI zum Verwalten              |
| Produktattribute            | 🟡     | Schema da (size, color etc.), kein UI         |
| Produktbilder/Medien        | 🟡     | Media-Schema da, kein Upload                  |
| Kategorien CRUD             | ✅     | API + Admin                                   |
| Kategorie-Baum (Hierarchie) | 🟡     | parentId in Schema, Tree-API da, kein Tree-UI |
| Produktsuche (Admin)        | ❌     | Filter/Suche in Produktliste                  |
| Bulk-Import/Export          | ❌     | CSV/JSON Import für Massenanlage              |
| SEO-Felder (Meta, Slug)     | 🟡     | Slug da, keine Meta-Description etc.          |

## 2. Storefront (Kundensicht)

| Feature            | Status | Details                                    |
| ------------------ | ------ | ------------------------------------------ |
| Homepage           | ✅     | Basic Layout                               |
| Produktliste       | ✅     | Grid mit Cards                             |
| Produktdetailseite | ✅     | Bild, Beschreibung, Preis                  |
| Kategorie-Seiten   | ✅     | Filter by Category                         |
| Suche              | ✅     | Basic Suchseite                            |
| Warenkorb (Client) | ✅     | Cart Provider + UI                         |
| Checkout-Seite     | 🟡     | Seite existiert, keine Payment-Integration |
| Responsive Design  | ✅     | Mobile-first                               |
| SEO (Meta Tags)    | ❌     | Dynamische Meta pro Seite                  |
| Breadcrumbs        | ❌     | Navigation-Hilfe                           |
| Produktbewertungen | ❌     | Reviews + Sterne                           |
| Wunschliste        | ❌     | Save for later                             |

## 3. Warenkorb & Checkout

| Feature          | Status | Details                                   |
| ---------------- | ------ | ----------------------------------------- |
| Cart Schema      | 🟡     | DB-Tabelle da (carts + cart_items)        |
| Cart API         | ❌     | CRUD Endpoints fehlen                     |
| Cart ↔ Session   | ❌     | Anonyme Carts (sessionId)                 |
| Cart ↔ Customer  | ❌     | Cart merge bei Login                      |
| Checkout Flow    | ❌     | Adresse → Versand → Zahlung → Bestätigung |
| Gutschein/Rabatt | ❌     | Discount-System (Codes, %, €)             |

## 4. Bestellungen

| Feature                  | Status | Details                                           |
| ------------------------ | ------ | ------------------------------------------------- |
| Order Schema             | 🟡     | Tabellen da (orders, order_items, status_history) |
| Order API                | ❌     | CRUD + Status-Transitions                         |
| Bestellübersicht (Admin) | 🟡     | Seite da, keine Daten                             |
| Bestelldetail (Admin)    | ❌     | Items, Status, Kunde, Zahlung                     |
| Status-Workflow          | ❌     | pending → confirmed → shipped → delivered         |
| Bestätigungs-Email       | ❌     | Transaktionale Emails                             |
| Rechnung/PDF             | ❌     | Invoice-Generierung                               |

## 5. Kunden

| Feature              | Status | Details                   |
| -------------------- | ------ | ------------------------- |
| Customer Schema      | 🟡     | Tabelle da                |
| Customer API         | ❌     | CRUD Endpoints            |
| Kundenliste (Admin)  | 🟡     | Seite da, keine Daten     |
| Kundendetail (Admin) | ❌     | Bestellhistorie, Adressen |
| Kunden-Registration  | ❌     | Storefront Signup/Login   |
| Passwort Reset       | ❌     | Email-basiert             |
| Gastbestellung       | ❌     | Checkout ohne Account     |

## 6. Zahlung

| Feature              | Status | Details                  |
| -------------------- | ------ | ------------------------ |
| Payment Schema       | 🟡     | Tabelle da               |
| Stripe Integration   | ❌     | Keys in .env vorbereitet |
| PayPal               | ❌     | —                        |
| Vorkasse/Überweisung | ❌     | Manuelle Zahlung         |
| Payment Webhooks     | ❌     | Stripe → Status-Update   |
| Refunds              | ❌     | Rückerstattungen         |

## 7. Versand

| Feature                  | Status | Details                |
| ------------------------ | ------ | ---------------------- |
| Shipping Methods Schema  | 🟡     | Tabelle da             |
| Shipping API             | ❌     | CRUD für Versandarten  |
| Shipping (Admin UI)      | ❌     | Versandarten verwalten |
| Versandkosten-Berechnung | ❌     | Gewicht/Preis-basiert  |
| Tracking-Nummern         | ❌     | Pro Bestellung         |

## 8. Steuern

| Feature          | Status | Details                     |
| ---------------- | ------ | --------------------------- |
| Tax Rules Schema | 🟡     | Tabelle da                  |
| Tax API          | ❌     | CRUD für Steuerregeln       |
| Tax Calculation  | ❌     | Auto-Berechnung im Checkout |

## 9. Admin & Auth

| Feature                | Status | Details                            |
| ---------------------- | ------ | ---------------------------------- |
| Admin User Schema      | 🟡     | Tabelle da                         |
| Login Page             | ✅     | UI da                              |
| Auth API (JWT/Session) | ❌     | Kein echtes Auth! Login ist Fake   |
| Role-based Access      | ❌     | Admin vs. Editor vs. Viewer        |
| Dashboard Stats        | ❌     | Revenue, Orders, Customers Widgets |
| Settings Page          | 🟡     | Seite da, keine Funktionen         |
| Activity Log           | ❌     | Wer hat was geändert               |

## 10. AI Features (USP!)

| Feature                        | Status | Details                                    |
| ------------------------------ | ------ | ------------------------------------------ |
| AI Package                     | 🟡     | Provider-Setup (OpenAI, Anthropic, Ollama) |
| Produktbeschreibung generieren | ❌     | AI schreibt Description aus Titel/Keywords |
| SEO-Text generieren            | ❌     | Meta-Description, Alt-Texts                |
| Chatbot (Storefront)           | ❌     | Kundenberatung per AI                      |
| Smart Search                   | ❌     | Semantische Suche statt Keyword            |
| Produktempfehlungen            | ❌     | "Das könnte dir gefallen"                  |
| Auto-Kategorisierung           | ❌     | AI ordnet Produkte in Kategorien ein       |
| Bild-Analyse                   | ❌     | Alt-Text aus Bild generieren               |

## 11. Medien & Uploads

| Feature             | Status | Details                     |
| ------------------- | ------ | --------------------------- |
| Media Schema        | 🟡     | Tabelle da                  |
| Media Upload API    | ❌     | File Upload Endpoint        |
| Bild-Upload (Admin) | ❌     | Drag & Drop in Produkten    |
| Image Optimization  | ❌     | Resize, WebP, Thumbnails    |
| CDN                 | ❌     | S3/R2 statt lokaler Storage |

## 12. Plugins & Erweiterbarkeit

| Feature       | Status | Details                     |
| ------------- | ------ | --------------------------- |
| Plugin Schema | 🟡     | Tabelle da                  |
| Plugin Loader | ❌     | Dynamisches Laden           |
| EventBus      | ✅     | In core/ implementiert      |
| Hook System   | ❌     | before/after Hooks für CRUD |

## 13. Infrastruktur

| Feature                  | Status | Details                      |
| ------------------------ | ------ | ---------------------------- |
| PostgreSQL               | ✅     | Läuft auf Server             |
| Caddy Reverse Proxy      | ✅     | Auto-SSL für alle Subdomains |
| Production Build (Admin) | ✅     | 25x schneller als dev        |
| Systemd Services         | ❌     | Aktuell manuell gestartet    |
| Backups                  | ❌     | DB + Media Backups           |
| Monitoring               | ❌     | Health Checks, Alerts        |
| CI/CD                    | ❌     | Auto-Deploy bei Push         |
| Rate Limiting            | ❌     | API Protection               |

---

## Prioritäten (Empfehlung)

### Phase 1 — MVP (macht den Shop benutzbar)

1. ⭐ **Admin Auth** (echtes Login, nicht fake)
2. ⭐ **Produktbilder Upload** (ohne Bilder kein Shop)
3. ⭐ **Cart API** (Server-Side Warenkorb)
4. ⭐ **Checkout Flow** (Adresse → Versand → Bestätigung)
5. ⭐ **Order API + Admin** (Bestellungen verwalten)
6. ⭐ **Stripe Payment** (Geld einsammeln)
7. ⭐ **Systemd Services** (überlebt Reboot)

### Phase 2 — Poliert

- Customer Auth (Registration, Login)
- Transaktionale Emails (Bestellbestätigung)
- Versandarten verwalten
- Steuer-Berechnung
- Dashboard mit echten Stats
- SEO-Felder

### Phase 3 — AI Magic (USP!)

- AI Produktbeschreibungen
- Smart Search
- Chatbot
- Auto-Kategorisierung
- Produktempfehlungen
