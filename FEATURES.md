# ForkCart — Feature Checklist

## Legende

- ✅ Done — funktioniert (API + UI)
- 🟡 API da — Backend fertig, UI fehlt/basic
- ❌ Fehlt — muss gebaut werden

_Stand: 18. März 2026_

---

## 1. Produkte & Katalog

| Feature              | Status | Details                                                                  |
| -------------------- | ------ | ------------------------------------------------------------------------ |
| Produkte CRUD        | ✅     | API + Admin UI (170 Zeilen API)                                          |
| Produktvarianten     | ✅     | CRUD, Generate aus Attributen, Bulk Update (124 Zeilen API)              |
| Produktattribute     | ✅     | Admin UI (`/attributes`)                                                 |
| Produktbilder/Medien | ✅     | Media Schema + Upload                                                    |
| Kategorien CRUD      | ✅     | API + Admin, Hierarchie (parentId)                                       |
| Smart Search         | ✅     | Ranking (CTR+Conversion+Recency), Instant Search (Cmd+K), 199 Zeilen API |
| SEO-Felder           | ✅     | API + Admin UI (`/seo`), 96 Zeilen API                                   |
| Produktübersetzungen | ✅     | Multi-Language Product Content                                           |
| Produkt-Impressionen | ✅     | Click/View Tracking für Search Analytics                                 |
| Produkt-Reviews      | ✅     | API + Admin (`/reviews`)                                                 |
| 468 Demo-Produkte    | ✅     | Seed Data                                                                |
| Bulk-Import/Export   | ❌     | CSV/JSON Import für Massenanlage                                         |

## 2. Storefront (Kundensicht)

| Feature               | Status | Details                                                             |
| --------------------- | ------ | ------------------------------------------------------------------- |
| Homepage              | ✅     | Layout mit Page Builder                                             |
| Produktliste          | ✅     | Grid + Pagination + Sort/Filter                                     |
| Produktdetailseite    | ✅     | Bild, Beschreibung, Preis, Varianten, Add-to-Cart                   |
| Kategorie-Seiten      | ✅     | Filter + Sort                                                       |
| Suche                 | ✅     | Instant Search Overlay + Suchseite mit Filtern                      |
| Warenkorb             | ✅     | Cart Provider + UI + Page Builder Slots                             |
| Checkout              | ✅     | Vollständiger Flow mit Stripe Payment                               |
| Checkout Success      | ✅     | Bestätigungsseite                                                   |
| Responsive Design     | ✅     | Mobile-first                                                        |
| Wunschliste           | ✅     | Save for later (`/wishlist`)                                        |
| Account               | ✅     | Login, Register, Profil, Adressen, Bestellungen                     |
| i18n / Locale Routing | ✅     | URL-basiert (`/products` = Default, `/en/products` = Nicht-Default) |
| SEO (Meta Tags)       | ✅     | Dynamisch pro Seite                                                 |
| Page Builder Slots    | ✅     | Dynamic Page Renderer für Shop-Seiten                               |

## 3. Warenkorb & Checkout

| Feature          | Status | Details                                          |
| ---------------- | ------ | ------------------------------------------------ |
| Cart API         | ✅     | CRUD (145 Zeilen)                                |
| Cart ↔ Session   | ✅     | Anonyme + eingeloggte Carts                      |
| Checkout Flow    | ✅     | Adresse → Zahlung → Bestätigung                  |
| Gutschein/Rabatt | ✅     | Coupon System (118 Zeilen API) + Usages Tracking |

## 4. Bestellungen

| Feature                  | Status | Details                 |
| ------------------------ | ------ | ----------------------- |
| Order API                | ✅     | CRUD (69 Zeilen)        |
| Bestellübersicht (Admin) | ✅     | Admin `/orders`         |
| Bestätigungs-Email       | ✅     | Via Mailgun/SMTP Plugin |

## 5. Kunden

| Feature              | Status | Details                              |
| -------------------- | ------ | ------------------------------------ |
| Customer Auth        | ✅     | Registration, Login (151 Zeilen API) |
| Storefront Auth      | ✅     | Signup, Login, Profil, Adressen      |
| Kundenliste (Admin)  | ✅     | Admin `/customers`                   |
| Storefront Customers | ✅     | 112 Zeilen API                       |

## 6. Zahlung

| Feature       | Status | Details                                  |
| ------------- | ------ | ---------------------------------------- |
| Payment API   | ✅     | 122 Zeilen                               |
| Stripe Plugin | ✅     | Provider (193 Zeilen)                    |
| Plugin System | ✅     | Payment Provider Interface im Plugin SDK |

## 7. Versand

| Feature           | Status | Details                  |
| ----------------- | ------ | ------------------------ |
| Shipping Schema   | ✅     | DB + Admin (`/shipping`) |
| Shipping Admin UI | ✅     | Versandarten verwalten   |

## 8. Steuern

| Feature   | Status | Details           |
| --------- | ------ | ----------------- |
| Tax API   | ✅     | CRUD (155 Zeilen) |
| Tax Admin | ✅     | Admin `/tax`      |

## 9. Admin & Auth

| Feature            | Status | Details                                         |
| ------------------ | ------ | ----------------------------------------------- |
| Admin Auth         | ✅     | JWT/Session (auth.ts)                           |
| RBAC / Permissions | ✅     | Role-based Access (permissions.ts, requireRole) |
| User Management    | ✅     | 187 Zeilen API                                  |
| Dashboard          | ✅     | Admin `/dashboard`                              |
| Settings           | ✅     | Admin `/settings` inkl. Theme + Translations    |
| Login Page         | ✅     | Admin `/login`                                  |

## 10. AI Features (USP!)

| Feature                        | Status | Details                                |
| ------------------------------ | ------ | -------------------------------------- |
| AI Package                     | ✅     | OpenRouter + Gemini, Provider Registry |
| AI Admin                       | ✅     | Admin `/ai` — Settings, Generation     |
| Produktbeschreibung generieren | ✅     | AI-powered                             |
| SEO-Text generieren            | ✅     | Meta-Description etc.                  |
| Chatbot (Storefront)           | ✅     | Admin `/chatbot` + Storefront Chat     |
| Search Analytics Dashboard     | ✅     | Klick-Tracking, Conversion             |

## 11. i18n / Übersetzungen

| Feature              | Status | Details                        |
| -------------------- | ------ | ------------------------------ |
| i18n Middleware      | ✅     | URL-basiertes Locale Routing   |
| Translations API     | ✅     | 148 Zeilen                     |
| Product Translations | ✅     | Schema + Search Integration    |
| Page Translations    | ✅     | Schema                         |
| Admin Translations   | ✅     | Admin `/settings/translations` |

## 12. Plugins & Erweiterbarkeit

| Feature        | Status | Details                                         |
| -------------- | ------ | ----------------------------------------------- |
| Plugin System  | ✅     | Loader + Admin UI (196 Zeilen API)              |
| Plugin SDK     | ✅     | Payment, Email, Marketplace Provider Interfaces |
| EventBus       | ✅     | Core                                            |
| Stripe Plugin  | ✅     | Payment                                         |
| Mailgun Plugin | ✅     | Email                                           |
| SMTP Plugin    | ✅     | Email                                           |

## 13. Marketplace Plugins (Multi-Channel!)

| Feature             | Status | Details                                                  |
| ------------------- | ------ | -------------------------------------------------------- |
| Marketplace API     | ✅     | Connections, Sync Products/Orders/Inventory (128 Zeilen) |
| Marketplace Admin   | ✅     | Admin `/marketplace`                                     |
| Amazon Plugin       | ✅     | Auth + Provider                                          |
| eBay Plugin         | ✅     | Auth + Provider                                          |
| Otto Plugin         | ✅     | Auth + Provider                                          |
| Kaufland Plugin     | ✅     | Auth + Provider                                          |
| Marketplace Service | ✅     | Core Registry + Service                                  |

## 14. Multi-Currency

| Feature        | Status | Details             |
| -------------- | ------ | ------------------- |
| Currency API   | ✅     | CRUD (161 Zeilen)   |
| Currency Admin | ✅     | Admin `/currencies` |

## 15. CMS / Pages

| Feature           | Status | Details                               |
| ----------------- | ------ | ------------------------------------- |
| Pages API         | ✅     | CRUD (98 Zeilen)                      |
| Page Builder      | ✅     | Dynamic Page Renderer mit Drag & Drop |
| Page Translations | ✅     | Multi-Language                        |

## 16. Email System

| Feature        | Status | Details         |
| -------------- | ------ | --------------- |
| Email API      | ✅     | Sending + Logs  |
| Email Admin    | ✅     | Admin `/emails` |
| Mailgun Plugin | ✅     | Provider        |
| SMTP Plugin    | ✅     | Provider        |

## 17. Mobile App

| Feature        | Status | Details                        |
| -------------- | ------ | ------------------------------ |
| Mobile Package | ✅     | React Native (packages/mobile) |
| Mobile API     | ✅     | 171 Zeilen                     |
| Mobile Admin   | ✅     | Admin `/mobile-app`            |

## 18. Infrastruktur

| Feature             | Status | Details                                  |
| ------------------- | ------ | ---------------------------------------- |
| PostgreSQL          | ✅     | Drizzle ORM                              |
| Caddy Reverse Proxy | ✅     | Auto-SSL                                 |
| Production Build    | ✅     | Turbo Monorepo                           |
| CI/CD               | ✅     | GitHub Actions (Prettier + Build + Lint) |
| Security Audit      | ✅     | 31 Findings, ALLE gefixt (18.03.2026)    |
| Systemd Services    | ✅     | API + Admin + Storefront                 |

## 19. Sonstiges

| Feature          | Status | Details                 |
| ---------------- | ------ | ----------------------- |
| CLI Package      | ✅     | `@forkcart/cli`         |
| Wishlists        | ✅     | API + Storefront        |
| Product Reviews  | ✅     | API + Admin             |
| Coupons + Usages | ✅     | API + Admin             |
| Theme Settings   | ✅     | Admin `/settings/theme` |

---

## Was noch fehlt

| Feature                   | Priorität | Details                             |
| ------------------------- | --------- | ----------------------------------- |
| Bulk Import/Export        | Medium    | CSV/JSON für Massenanlage           |
| `npx create-forkcart`     | Medium    | CLI Installer (wie create-next-app) |
| Auto-Kategorisierung (AI) | Low       | AI ordnet Produkte ein              |
| Produktempfehlungen (AI)  | Low       | "Das könnte dir gefallen"           |
| Bild-Analyse (AI)         | Low       | Alt-Text aus Bild generieren        |

---

_ForkCart ist das EINZIGE TypeScript Full-Stack E-Commerce mit Storefront + AI + Page Builder + Marketplace Integration._
_Konkurrenz (Medusa, Vendure, Saleor) ist headless-only oder PHP._
