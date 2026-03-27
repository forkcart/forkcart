# ForkCart Architecture

This document explains the high-level architecture of ForkCart, including the relationship between the open-source Core and the Plugin Registry (Developer Portal).

---

## Overview

ForkCart follows a **hybrid open-core model**:

| Component            | License                     | Hosting                  | Purpose                       |
| -------------------- | --------------------------- | ------------------------ | ----------------------------- |
| **ForkCart Core**    | MIT (Open Source)           | Self-hosted by merchants | E-commerce platform           |
| **Developer Portal** | Proprietary (Closed Source) | Hosted by ForkCart       | Plugin marketplace & registry |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FORKCART ECOSYSTEM                              │
│                                                                         │
│  ┌──────────────────────────────────┐    ┌───────────────────────────┐ │
│  │     FORKCART CORE (Open)         │    │   DEVELOPER PORTAL        │ │
│  │     Self-hosted by merchants     │◄───│   (Closed, Central)       │ │
│  │                                  │    │                           │ │
│  │  • Storefront                    │    │  • Plugin Marketplace     │ │
│  │  • Admin Dashboard               │    │  • Developer Accounts     │ │
│  │  • API                           │    │  • Version Management     │ │
│  │  • Plugin Runtime                │    │  • Review/Approval Flow   │ │
│  │  • Local Plugin Config           │    │  • Analytics & Downloads  │ │
│  └──────────────────────────────────┘    └───────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ForkCart Core (Open Source)

**Repository:** `github.com/forkcart/forkcart`
**License:** MIT

The Core is a complete, self-hostable e-commerce platform. Merchants can run it without any connection to the Developer Portal — it works standalone.

### Packages

```
packages/
├── admin/          # React Admin Dashboard
├── ai/             # AI features (descriptions, chatbot, search)
├── api/            # Hono API server
├── cli/            # forkcart CLI
├── core/           # Business logic, plugin loader, services
├── create-forkcart/# npx create-forkcart scaffolder
├── database/       # Drizzle ORM schemas & migrations
├── i18n/           # Internationalization
├── mobile/         # Expo/React Native app
├── plugin-sdk/     # SDK for plugin development
├── shared/         # Shared types & utilities
└── storefront/     # Next.js storefront
```

### Database (Core)

Core's database contains **merchant data** and **local plugin state**:

```sql
-- Local plugin installation tracking
CREATE TABLE plugins (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  author VARCHAR(255),
  is_active BOOLEAN DEFAULT FALSE,
  entry_point VARCHAR(500),
  metadata JSONB,
  installed_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Per-plugin configuration
CREATE TABLE plugin_settings (
  id UUID PRIMARY KEY,
  plugin_id UUID REFERENCES plugins(id),
  key VARCHAR(255) NOT NULL,
  value JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Note:** Core does NOT store plugin listings, reviews, versions, or developer info. That data lives in the Developer Portal.

---

## Developer Portal (Closed Source)

**URL:** `https://developers.forkcart.com` (planned)
**License:** Proprietary

The Developer Portal is a central registry for the plugin marketplace. Think of it like:

- **npm** for Node packages
- **Shopware Store** for Shopware plugins
- **WordPress Plugin Directory**

### Features

- **Developer Accounts** — Register, manage API keys, track earnings
- **Plugin Submission** — Upload plugins, submit for review
- **Version Management** — Publish updates, changelogs, compatibility info
- **Review/Approval** — Quality control before plugins go live
- **Plugin Store API** — Browse, search, download plugins
- **Analytics** — Download counts, ratings, reviews
- **Monetization** (planned) — Paid plugins, subscriptions, revenue share

### Database (Portal)

```sql
-- Developer accounts
CREATE TABLE developers (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  display_name VARCHAR(255) NOT NULL,
  website TEXT,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE
);

-- Plugin listings
CREATE TABLE plugins (
  id UUID PRIMARY KEY,
  developer_id UUID REFERENCES developers(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  package_name VARCHAR(255) UNIQUE NOT NULL,
  short_description VARCHAR(500),
  description TEXT,
  type VARCHAR(50),          -- payment, marketplace, email, shipping, etc.
  category VARCHAR(100),
  icon TEXT,
  screenshots JSONB,
  readme TEXT,
  pricing VARCHAR(20),       -- free, paid, freemium
  price NUMERIC,
  status VARCHAR(20),        -- draft, in_review, approved, rejected
  is_featured BOOLEAN DEFAULT FALSE,
  downloads INTEGER DEFAULT 0,
  rating NUMERIC,
  rating_count INTEGER DEFAULT 0
);

-- Version history
CREATE TABLE plugin_versions (
  id UUID PRIMARY KEY,
  plugin_id UUID REFERENCES plugins(id),
  version VARCHAR(50) NOT NULL,
  changelog TEXT,
  min_forkcart_version VARCHAR(50),
  zip_path TEXT NOT NULL,
  zip_size INTEGER,
  checksum VARCHAR(128),
  status VARCHAR(20),        -- in_review, approved, rejected
  downloads INTEGER DEFAULT 0
);

-- User reviews
CREATE TABLE plugin_reviews (
  id UUID PRIMARY KEY,
  plugin_id UUID REFERENCES plugins(id),
  store_url VARCHAR(500) NOT NULL,  -- Which shop submitted the review
  display_name VARCHAR(255),
  rating INTEGER NOT NULL,
  title VARCHAR(255),
  body TEXT,
  is_verified BOOLEAN DEFAULT FALSE
);
```

---

## How Core Connects to Portal

Core includes a **PluginStoreService** that acts as a pure proxy to the Developer Portal:

```typescript
// packages/core/src/plugin-store/service.ts

const REGISTRY_URL = process.env['PLUGIN_REGISTRY_URL'];

export class PluginStoreService {
  // Browse plugins (proxied to Portal)
  async listPlugins(filters) {
    const res = await fetch(`${REGISTRY_URL}/store?...`);
    return res.json();
  }

  // Get plugin details (proxied to Portal)
  async getPlugin(slug) {
    const res = await fetch(`${REGISTRY_URL}/store/${slug}`);
    return res.json();
  }

  // Install from marketplace
  async installFromStore(slug) {
    // 1. Fetch plugin ZIP from Portal
    // 2. Extract to local plugins directory
    // 3. Register in local `plugins` table
    // 4. Run plugin's onInstall hook
  }

  // Local-only operations
  async uninstallPlugin(name) { ... }
  async activatePlugin(name) { ... }
  async deactivatePlugin(name) { ... }
}
```

### Environment Variable

```bash
# .env
PLUGIN_REGISTRY_URL=https://developers.forkcart.com/api/v1
```

If `PLUGIN_REGISTRY_URL` is not set, the plugin marketplace features are disabled, but Core still works with manually installed plugins.

---

## Plugin Installation Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Admin UI   │      │  Core API   │      │   Portal    │
│ (Merchant)  │      │             │      │  (Registry) │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │ 1. Click Install   │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │ 2. GET /store/slug │
       │                    │───────────────────>│
       │                    │                    │
       │                    │ 3. Plugin details  │
       │                    │<───────────────────│
       │                    │                    │
       │                    │ 4. GET /download   │
       │                    │───────────────────>│
       │                    │                    │
       │                    │ 5. ZIP file        │
       │                    │<───────────────────│
       │                    │                    │
       │                    │ 6. Extract & Install
       │                    │ (local)            │
       │                    │                    │
       │ 7. Success         │                    │
       │<───────────────────│                    │
       │                    │                    │
```

---

## Plugin Development Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Developer  │      │   Portal    │      │   Admin     │
│             │      │  (Registry) │      │ (Reviewer)  │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │ 1. Register        │                    │
       │───────────────────>│                    │
       │                    │                    │
       │ 2. API Key         │                    │
       │<───────────────────│                    │
       │                    │                    │
       │ 3. Submit Plugin   │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │ 4. Review Queue    │
       │                    │───────────────────>│
       │                    │                    │
       │                    │ 5. Approve/Reject  │
       │                    │<───────────────────│
       │                    │                    │
       │ 6. Status Update   │                    │
       │<───────────────────│                    │
       │                    │                    │
```

---

## Offline / Air-Gapped Mode

Core works without any connection to the Developer Portal:

1. **Manual Plugin Installation**

   ```bash
   # Download plugin ZIP manually
   forkcart plugin install ./my-plugin-1.0.0.zip
   ```

2. **Local Plugin Development**

   ```bash
   # Create plugin in packages/plugins/
   # Register directly in app.ts
   await pluginLoader.registerSdkPlugin(myLocalPlugin);
   ```

3. **No Marketplace**
   - Plugin Store UI shows "Registry not configured"
   - All other Core features work normally

---

## Security Considerations

### Core (Self-Hosted)

- Merchant controls their own data
- Database credentials stay local
- No telemetry or phone-home by default
- Plugins run in the same Node.js process (trust your plugins!)

### Portal (Central)

- Plugin ZIPs are scanned for malware before approval
- Code review for featured/promoted plugins
- Rate limiting on API endpoints
- Developer verification for paid plugins

### Plugin Installation

- ZIPs are checksummed (SHA-256)
- Signatures planned for future (developer key signing)
- Merchants can disable auto-updates

---

## Future Roadmap

- [ ] **Plugin Signing** — Cryptographic signatures for verified plugins
- [ ] **Paid Plugins** — Stripe integration, license keys, revenue share
- [ ] **Plugin Bundles** — Curated collections for specific use cases
- [ ] **Auto-Updates** — Opt-in automatic plugin updates
- [ ] **Usage Analytics** — Anonymous aggregated stats (opt-in)
- [ ] **Multi-Region** — CDN for plugin downloads

---

## Related Documentation

- [Plugin Development Guide](./PLUGINS.md)
- [Self-Hosting Guide](./self-hosting.md)
- [API Reference](./API.md)
