# ForkCart — AI-First Open Source E-Commerce Platform

*Von Fabian & Nyx. Weil Shopware zu kompliziert und Shopify zu teuer ist.*

---

## Vision

Ein vollwertiges, modernes Shopsystem — Open Source, self-hosted oder Cloud. Alles per Hand steuerbar, aber mit AI-Assist überall wo es Arbeit spart. Plus: Automatische native iOS/Android App-Generierung aus dem Shop-Content.

**Nicht ein AI-Chatbot mit Shop dran. Sondern ein SHOP mit AI drin.**

---

## Was ForkCart von allem anderen unterscheidet

| Feature | Shopware | Shopify | ForkCart |
|---------|----------|---------|----------|
| Open Source | "Community" (kastriert) | ❌ Nein | ✅ Vollständig |
| Self-hosted | ✅ (komplex) | ❌ | ✅ (One-Click Docker) |
| Cloud Option | ✅ (teuer) | ✅ | ✅ (geplant) |
| AI-Assist | Plugin (extra) | Shopify Magic (basic) | **Überall, nativ** |
| Native App | ❌ | Extra Kosten | **Auto-generiert** |
| Onboarding | Wochen | Stunden | **Minuten** |
| Extension Store | 30% Provision | 20% Provision | **Open Marketplace** |
| Tech Stack | Symfony/PHP | Ruby/Liquid | **Next.js/Node.js** |

---

## Core Features (v1.0)

### 🏪 Shop-Grundfunktionen
- Produktverwaltung (einfach, Varianten, digitale Produkte)
- Kategorien & Kollektionen
- Bestellverwaltung & Fulfillment
- Kundenverwaltung & Accounts
- Warenkorb & Checkout
- Zahlungsanbieter (Stripe, PayPal, Klarna)
- Versandregeln & Carrier Integration (DHL, DPD, GLS)
- Steuerverwaltung (DE/EU/international)
- Rabatte & Gutscheine
- Mehrsprachigkeit
- Multi-Currency

### 🎨 Storefront & Design
- Theme-System (einfach, nicht 500 Config-Optionen)
- Drag & Drop Page Builder
- Responsive out-of-the-box
- Custom CSS/JS möglich
- Template-Bibliothek (branchenspezifisch)

### 🤖 AI-Assist (überall optional, alles auch manuell)
- **Produktbeschreibungen:** Button → AI generiert aus Stichworten
- **SEO-Texte:** Meta-Title, Description, Alt-Tags automatisch
- **Bildbearbeitung:** Freistellen, Hintergrund entfernen/ändern, Resize
- **Bildgenerierung:** Produkt-Mockups, Lifestyle-Bilder
- **Layout-Assistent:** "Mach die Startseite weihnachtlich" → Vorschlag
- **Übersetzungen:** Ein Klick → Shop in 10 Sprachen
- **Kundenservice-Bot:** Einbaubarer Chat der Bestellstatus etc. kennt
- **Analytics-Insights:** "Warum sind meine Verkäufe eingebrochen?" → Analyse
- **Empfehlungen:** "Häufig zusammen gekauft" / "Das könnte dir gefallen"
- **Smart Pricing:** Preisvorschläge basierend auf Markt + Marge

### 📱 Native App (Auto-Generated)
- React Native Codebase
- Automatisch generiert aus Shop-Content
- Branding (Logo, Farben, Fonts) aus dem Shop übernommen
- Push-Notifications
- Native Navigation, Performance, UX
- One-Click Build für iOS + Android
- Automatische Updates wenn Shop sich ändert
- Deep Linking
- Offline-Katalog-Browsing

### 🔌 Plugin/Extension System
- Einfache Plugin API
- Hooks & Events (nicht Symfony-Events-Hölle)
- Open Marketplace (keine 30% Provision!)
- Community Plugins + Verified Plugins
- Plugin CLI für Entwickler

### 📊 Admin Panel
- Clean, modernes UI
- Dashboard mit den wichtigsten KPIs
- Schnellaktionen (häufigste Tasks mit 1 Klick)
- Bulk-Operationen
- Activity Log
- Role-based Access Control
- **AI-Chat-Sidebar:** Optional, für die die es wollen

---

## Tech Stack

### Backend
- **Runtime:** Node.js (Bun optional)
- **Framework:** Hono oder Fastify (leichtgewichtig, schnell)
- **Database:** PostgreSQL (Haupt) + SQLite (Self-hosted Light)
- **ORM:** Drizzle
- **Search:** Meilisearch (self-hosted) oder built-in SQLite FTS
- **Queue:** BullMQ / Redis
- **File Storage:** Local / S3-compatible
- **Auth:** Session-based + JWT für API

### Frontend (Storefront)
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Rendering:** SSR + ISR für Performance + SEO

### Admin Panel
- **Framework:** Next.js oder Vite + React
- **UI Library:** Shadcn/ui
- **Data Fetching:** TanStack Query

### Native App
- **Framework:** React Native + Expo
- **Navigation:** React Navigation
- **State:** Zustand (shared logic mit Web)
- **Build:** EAS Build (Expo Application Services)
- **Auto-Generation:** CLI Tool das aus Shop-Config die App baut

### AI Layer
- **Provider-agnostic:** OpenAI, Anthropic, Ollama (self-hosted!)
- **Image:** Stable Diffusion / DALL-E / Flux
- **Embeddings:** Für semantische Suche
- **Konfiguierbar:** Eigene API Keys, eigene Modelle

---

## Architektur

```
┌─────────────────────────────────────────────┐
│                  Storefront                  │
│              (Next.js / SSR)                 │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│              REST / GraphQL API              │
│           (Hono / Fastify / Node)            │
├──────────┬──────────┬───────────┬───────────┤
│ Products │ Orders   │ Customers │ AI Layer  │
│ Module   │ Module   │ Module    │ Module    │
└──────┬───┴────┬─────┴─────┬─────┴─────┬─────┘
       │        │           │           │
  ┌────┴────┐ ┌─┴──┐  ┌────┴───┐  ┌───┴────┐
  │ Postgres│ │Redis│  │Search  │  │AI APIs │
  │ /SQLite │ │Queue│  │Meili   │  │OpenAI  │
  └─────────┘ └────┘  └────────┘  │Anthropic│
                                   │Ollama  │
                                   └────────┘
┌─────────────────────────────────────────────┐
│              Admin Panel                     │
│          (React + Shadcn/ui)                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         Native App (React Native)            │
│     Auto-generated from Shop Config          │
└─────────────────────────────────────────────┘
```

---

## Deployment-Optionen

### Self-Hosted (Free)
```bash
docker compose up -d
# → Shop läuft auf localhost:3000
```

### One-Click Deploy
- Railway
- Coolify
- DigitalOcean App Platform
- Hetzner (Docker)

### Cloud (Hosted — geplant, $$$)
- forkcart.com → Sign up → Shop läuft
- €29/Monat Starter
- €79/Monat Pro (AI-Features, Native App)
- €199/Monat Enterprise

---

## Monetarisierung (WordPress-Modell)

*Vorbild: WordPress.org (Free) + WordPress.com (Hosted) = Automattic ($7.5B)*

### 1. Hosted Version (Haupteinnahme)
forkcart.com → Sign up → Shop läuft in 2 Minuten

| Tier | Preis | Features |
|------|-------|----------|
| **Starter** | €19/Mo | 1 Shop, Basics, Community Support |
| **Pro** | €49/Mo | AI-Features, Native App, Priority Support |
| **Business** | €99/Mo | Multi-Store, API-Access, Dedicated Support |
| **Enterprise** | Custom | SLA, SSO, Custom Features |

### 2. Marketplace (passives Einkommen)
- Premium Themes (eigene + Community)
- Plugin-Verkäufe: **10-15% Revenue Share** (nicht 30% wie Shopware!)
- Niedrige Provision = mehr Entwickler = mehr Plugins = mehr Kunden

### 3. AI-Credits
- Basis-AI: X Generierungen/Monat gratis
- **AI Unlimited: €9/Monat** für Power-User
- Provider-agnostisch (eigene Keys auch möglich)

### 4. Native App Build Service
- App generieren = free (self-build)
- **App Store Submission + Maintenance: €29/Monat**
- Automatische Updates wenn Shop sich ändert
- KEINER bietet das so an

### 5. Premium Support & Partner
- Certified Agency Partner Programm
- Partner zahlen für Partnerschaft + Lead-Zugang
- Enterprise Support Verträge

### Strategie
**Open Source = Community + Reputation + Vertrauen**
**Hosted Version = druckt das Geld**
Genau wie WordPress.

---

## Roadmap

### Phase 1 — MVP (4-8 Wochen)
- [ ] Core: Produkte, Kategorien, Warenkorb, Checkout
- [ ] Admin Panel: Produktverwaltung, Bestellungen
- [ ] Storefront: 1 Theme, responsive
- [ ] Zahlung: Stripe Integration
- [ ] Deployment: Docker Compose
- [ ] Basic AI: Produktbeschreibungen generieren

### Phase 2 — Beta (8-16 Wochen)
- [ ] Native App Generator (React Native + Expo)
- [ ] Plugin System
- [ ] Mehr AI-Features (SEO, Bilder, Übersetzungen)
- [ ] Page Builder (Drag & Drop)
- [ ] Mehr Payment Provider
- [ ] Versand-Integration

### Phase 3 — Launch
- [ ] Cloud Hosting Option
- [ ] Marketplace für Plugins/Themes
- [ ] Documentation Site
- [ ] Community Forum
- [ ] Marketing Push

---

## Name?

Arbeitstitel: **ForkCart**

Alternativen:
- CartForge
- FreeCart
- ShopCore
- Vendure (existiert schon)
- SellerKit

---

## Warum WIR das bauen können

1. **Fabian:** 8 Jahre E-Commerce, kennt Shopware von innen, weiß was fehlt
2. **Nyx + Bienen:** AI-Power für schnelle Entwicklung
3. **Real-World-Erfahrung:** Nicht theoretisch was Shops brauchen — Pastaclean IS der Use Case
4. **Open Source Community:** Wenn das Produkt gut ist, kommen Contributors
5. **AI-First ist der Zeitgeist:** Jeder will AI in seinem Stack, keiner hat's gut im E-Commerce

---

*Erstellt: 12. März 2026*
*Von: Fabian & Nyx 🦞*
