# ForkCart Plugin Development Guide

Build plugins that extend ForkCart — payment providers, marketplaces, email services, shipping, analytics, and custom features.

## Quick Start

### 1. Create Plugin Structure

```
my-plugin/
├── src/
│   └── index.ts          # Plugin definition
├── forkcart-plugin.json  # Plugin manifest (required for marketplace)
├── package.json          # NPM package info
├── README.md             # Documentation
└── tsconfig.json
```

### 2. Create the Manifest (`forkcart-plugin.json`)

```json
{
  "name": "My Awesome Plugin",
  "slug": "my-awesome-plugin",
  "packageName": "forkcart-plugin-my-awesome",
  "version": "1.0.0",
  "type": "general",
  "description": "Does awesome things",
  "author": "Your Name",
  "license": "MIT",
  "minForkcartVersion": "0.5.0",
  "entryPoint": "dist/index.js"
}
```

| Field                | Required | Description                                      |
| -------------------- | -------- | ------------------------------------------------ |
| `name`               | ✅       | Human-readable plugin name                       |
| `slug`               | ✅       | URL-safe identifier (lowercase, hyphens)         |
| `packageName`        | ✅       | NPM package name                                 |
| `version`            | ✅       | Semver version                                   |
| `type`               | ✅       | Plugin type (see below)                          |
| `description`        |          | Short description for marketplace                |
| `author`             |          | Author name                                      |
| `license`            |          | License (MIT, GPL-3.0, etc.)                     |
| `minForkcartVersion` |          | Minimum ForkCart version required                |
| `entryPoint`         |          | Path to compiled JS entry point (default: dist/) |

### 3. Define Your Plugin

```typescript
// src/index.ts
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'my-awesome-plugin',
  version: '1.0.0',
  type: 'general',
  description: 'Does awesome things',
  author: 'Your Name',

  settings: {
    apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
    enabled: { type: 'boolean', label: 'Enabled', default: true },
  },

  hooks: {
    'order:created': async (event, ctx) => {
      ctx.logger.info('New order!', { orderId: event.payload.orderId });
    },
  },
});
```

---

## Plugin Types

| Type          | Purpose                                    |
| ------------- | ------------------------------------------ |
| `payment`     | Payment gateways (Stripe, PayPal, Klarna)  |
| `marketplace` | External marketplaces (Amazon, eBay, Otto) |
| `email`       | Email providers (Mailgun, SendGrid, SMTP)  |
| `shipping`    | Shipping & carriers (DHL, FedEx, UPS)      |
| `analytics`   | Tracking & analytics (GA4, Plausible)      |
| `general`     | Everything else                            |

---

## Settings Schema

Define settings that auto-generate admin UI forms:

```typescript
settings: {
  // Text input
  apiKey: {
    type: 'string',
    label: 'API Key',
    required: true,
    secret: true,        // Masked in UI
    placeholder: 'sk_...',
    description: 'Your secret API key',
  },

  // Number input
  timeout: {
    type: 'number',
    label: 'Timeout (seconds)',
    default: 30,
    min: 1,
    max: 300,
  },

  // Checkbox
  sandboxMode: {
    type: 'boolean',
    label: 'Sandbox Mode',
    default: false,
  },

  // Dropdown
  region: {
    type: 'select',
    label: 'Region',
    options: ['US', 'EU', 'APAC'],
    default: 'US',
  },
}
```

---

## Event Hooks

React to domain events:

```typescript
hooks: {
  // Order lifecycle
  'order:created': async (event, ctx) => { },
  'order:paid': async (event, ctx) => { },
  'order:shipped': async (event, ctx) => { },
  'order:cancelled': async (event, ctx) => { },
  'order:refunded': async (event, ctx) => { },

  // Product events
  'product:created': async (event, ctx) => { },
  'product:updated': async (event, ctx) => { },
  'product:deleted': async (event, ctx) => { },

  // Cart events
  'cart:created': async (event, ctx) => { },
  'cart:updated': async (event, ctx) => { },
  'cart:item-added': async (event, ctx) => { },
  'cart:item-removed': async (event, ctx) => { },

  // Customer events
  'customer:registered': async (event, ctx) => { },
  'customer:updated': async (event, ctx) => { },

  // Checkout events
  'checkout:started': async (event, ctx) => { },
  'checkout:completed': async (event, ctx) => { },

  // Inventory events
  'inventory:updated': async (event, ctx) => { },
  'inventory:low': async (event, ctx) => { },

  // Plugin events
  'plugin:activated': async (event, ctx) => { },
  'plugin:deactivated': async (event, ctx) => { },
}
```

### Event Payloads

```typescript
// order:created
interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    productId: string;
    variantId?: string;
    sku?: string;
    quantity: number;
    price: number;
  }>;
}

// order:paid
interface OrderPaidPayload {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  provider: string;
}

// inventory:low
interface InventoryLowPayload {
  productId: string;
  variantId?: string;
  sku?: string;
  currentQuantity: number;
  threshold: number;
}
```

---

## Filters (Data Transformation)

Transform data as it flows through the system:

```typescript
filters: {
  // Modify product price
  'product:price': (price, ctx) => {
    return price * 0.9; // 10% off everything
  },

  // Filter search results
  'search:results': (results, ctx) => {
    return results.filter(p => p.isAvailable);
  },

  // Modify cart totals
  'cart:total': (total, ctx) => total,
  'cart:shipping': (shipping, ctx) => shipping,
  'cart:tax': (tax, ctx) => tax,

  // Checkout customization
  'checkout:payment-methods': (methods, ctx) => methods,
  'checkout:shipping-methods': (methods, ctx) => methods,

  // Order confirmation
  'order:confirmation-email': (email, ctx) => email,

  // Search
  'search:query': (query, ctx) => query,

  // Admin menu customization
  'admin:menu': (menu, ctx) => menu,

  // Storefront injection
  'storefront:head': (html, ctx) => html,
  'storefront:footer': (html, ctx) => html,
}
```

---

## Storefront Slots

Inject HTML into the storefront:

```typescript
storefrontSlots: [
  {
    slot: 'header-after',
    content: '<div class="announcement">Free shipping over $50!</div>',
    order: 10,
  },
  {
    slot: 'product-page-bottom',
    content: '<img src="/trust-badge.png" alt="Trusted" />',
    pages: ['/product/*'],
  },
];
```

**Available slots:**

| Slot                      | Location                |
| ------------------------- | ----------------------- |
| `head`                    | Inside `<head>`         |
| `body-start`              | Start of `<body>`       |
| `body-end`                | End of `<body>`         |
| `header-before`           | Before header           |
| `header-after`            | After header            |
| `footer-before`           | Before footer           |
| `footer-after`            | After footer            |
| `product-page-top`        | Top of product page     |
| `product-page-bottom`     | Bottom of product page  |
| `product-page-sidebar`    | Product page sidebar    |
| `cart-page-top`           | Top of cart page        |
| `cart-page-bottom`        | Bottom of cart page     |
| `checkout-before-payment` | Before payment form     |
| `checkout-after-payment`  | After payment form      |
| `category-page-top`       | Top of category page    |
| `category-page-bottom`    | Bottom of category page |

---

## Custom API Routes

Add custom HTTP endpoints:

```typescript
routes: (router) => {
  router.get('/status', (c) => {
    return c.json({ status: 'ok' });
  });

  router.post('/webhook', async (c) => {
    const body = await c.req.json();
    // Handle webhook
    return c.json({ received: true });
  });
};
// Routes are mounted at: /api/v1/plugins/<plugin-name>/
```

---

## Admin Pages

Add custom pages to the admin panel:

```typescript
adminPages: [
  {
    path: '/analytics',
    label: 'Analytics Dashboard',
    icon: 'chart-bar',
    order: 10,
  },
  {
    path: '/analytics/reports',
    label: 'Reports',
    parent: '/analytics',
    order: 20,
  },
];
```

---

## CLI Commands

Add custom CLI commands:

```typescript
cli: [
  {
    name: 'sync',
    description: 'Sync products to marketplace',
    args: [{ name: 'sku', description: 'Product SKU', required: false }],
    options: [
      { name: 'force', alias: 'f', description: 'Force sync', type: 'boolean', default: false },
    ],
    handler: async (args, ctx) => {
      ctx.logger.info('Syncing...', args);
    },
  },
];
// Run with: forkcart plugin run <plugin-name>:sync
```

---

## Scheduled Tasks

Run tasks on a schedule:

```typescript
scheduledTasks: [
  {
    name: 'daily-sync',
    schedule: '0 3 * * *', // 3 AM daily
    enabled: true,
    handler: async (ctx) => {
      await syncInventory(ctx);
    },
  },
];
```

---

## Database Migrations

Add custom tables:

```typescript
migrations: [
  {
    version: '1.0.0',
    description: 'Create analytics table',
    up: async (db) => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS plugin_analytics_events (
          id SERIAL PRIMARY KEY,
          event_type TEXT NOT NULL,
          data JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    },
    down: async (db) => {
      await db.execute('DROP TABLE IF EXISTS plugin_analytics_events;');
    },
  },
];
```

---

## Lifecycle Hooks

```typescript
onInstall: async (ctx) => {
  // First-time setup
  ctx.logger.info('Plugin installed!');
},

onUninstall: async (ctx) => {
  // Cleanup
},

onActivate: async (ctx) => {
  // Start background tasks
},

onDeactivate: async (ctx) => {
  // Stop background tasks
},

onUpdate: async (ctx, fromVersion) => {
  // Handle version migrations
  if (fromVersion < '2.0.0') {
    // Migrate old data
  }
},
```

---

## Plugin Context

Every handler receives a context object:

```typescript
interface PluginContext {
  settings: Record<string, unknown>; // Resolved settings values
  db: unknown; // Database connection (Drizzle)
  logger: PluginLogger; // Scoped logger
  eventBus: PluginEventBus; // Emit/subscribe to events
}
```

---

## Permissions

Declare what your plugin needs access to:

```typescript
permissions: [
  'orders:read',
  'orders:write',
  'products:read',
  'products:write',
  'customers:read',
  'customers:write',
  'settings:read',
  'settings:write',
  'email:send',
  'payments:process',
  'inventory:read',
  'inventory:write',
  'analytics:read',
  'files:read',
  'files:write',
  'webhooks:manage',
  'admin:full',
];
```

---

## Plugin Dependencies

Require other plugins to be installed:

```typescript
dependencies: ['stripe', 'mailgun'],
minVersion: '0.5.0', // Minimum ForkCart version
```

---

## Provider Implementations

### Payment Provider

```typescript
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'stripe',
  version: '1.0.0',
  type: 'payment',
  description: 'Accept payments via Stripe',
  author: 'ForkCart',

  settings: {
    secretKey: { type: 'string', label: 'Secret Key', required: true, secret: true },
    publishableKey: { type: 'string', label: 'Publishable Key', required: true },
    webhookSecret: { type: 'string', label: 'Webhook Secret', secret: true },
  },

  provider: {
    async initialize(settings) {
      // Initialize Stripe client
    },

    isConfigured() {
      return Boolean(this.secretKey && this.publishableKey);
    },

    getClientConfig() {
      return {
        provider: 'stripe',
        displayName: 'Credit Card',
        componentType: 'stripe-elements',
        clientConfig: { publishableKey: this.publishableKey },
      };
    },

    async createPaymentIntent(input) {
      // Create Stripe PaymentIntent
      return {
        clientSecret: 'pi_xxx_secret_xxx',
        externalId: 'pi_xxx',
        amount: input.amount,
        currency: input.currency,
      };
    },

    async verifyWebhook(rawBody, headers) {
      // Verify Stripe signature
      return {
        type: 'payment.succeeded',
        externalId: 'pi_xxx',
        amount: 2999,
        currency: 'usd',
        metadata: {},
        rawEvent: {},
      };
    },

    async getPaymentStatus(externalId) {
      return {
        status: 'succeeded',
        externalId,
        amount: 2999,
        currency: 'usd',
      };
    },
  },
});
```

### Marketplace Provider

```typescript
export default definePlugin({
  name: 'amazon',
  version: '1.0.0',
  type: 'marketplace',
  description: 'Sell on Amazon',
  author: 'ForkCart',

  settings: {
    sellerId: { type: 'string', label: 'Seller ID', required: true },
    accessKey: { type: 'string', label: 'Access Key', required: true, secret: true },
    secretKey: { type: 'string', label: 'Secret Key', required: true, secret: true },
    region: { type: 'select', label: 'Region', options: ['NA', 'EU', 'FE'], default: 'EU' },
  },

  provider: {
    async connect(settings) {},
    async disconnect() {},
    async testConnection() {
      return { ok: true };
    },

    async listProduct(product) {
      return {
        id: 'listing_123',
        marketplaceId: 'amazon',
        externalId: 'ASIN123',
        status: 'active',
        url: 'https://amazon.com/dp/ASIN123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    async updateListing(listingId, product) {},
    async deleteListing(listingId) {},
    async fetchOrders(since) {
      return [];
    },
    async acknowledgeOrder(orderId) {},
    async updateShipment(orderId, tracking) {},
    async updateInventory(sku, quantity) {},
    async bulkUpdateInventory(items) {},
    async getMarketplaceCategories() {
      return [];
    },
  },
});
```

### Email Provider

```typescript
export default definePlugin({
  name: 'mailgun',
  version: '1.0.0',
  type: 'email',
  description: 'Send emails via Mailgun',
  author: 'ForkCart',

  settings: {
    apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
    domain: { type: 'string', label: 'Domain', required: true },
    region: { type: 'select', label: 'Region', options: ['US', 'EU'], default: 'US' },
  },

  provider: {
    async initialize(settings) {},
    isConfigured() {
      return true;
    },

    async sendEmail(input) {
      // Send via Mailgun API
      return {
        messageId: 'msg_xxx',
        accepted: true,
      };
    },
  },
});
```

### Shipping Provider

```typescript
export default definePlugin({
  name: 'dhl',
  version: '1.0.0',
  type: 'shipping',
  description: 'Ship with DHL',
  author: 'ForkCart',

  settings: {
    apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
    accountNumber: { type: 'string', label: 'Account Number', required: true },
  },

  provider: {
    async initialize(settings) {},

    async getRates(from, to, parcels) {
      return [
        {
          id: 'dhl_express',
          name: 'DHL Express',
          price: 1299,
          currency: 'EUR',
          estimatedDays: 2,
          carrier: 'DHL',
        },
      ];
    },

    async createShipment(from, to, parcels, rateId) {
      return {
        trackingNumber: '1234567890',
        carrier: 'DHL',
        labelUrl: 'https://...',
        trackingUrl: 'https://...',
      };
    },

    async getTracking(trackingNumber) {
      return [
        {
          status: 'in_transit',
          location: 'Leipzig, DE',
          timestamp: new Date(),
          description: 'Package in transit',
        },
      ];
    },
  },
});
```

---

## Full Example: Discount Codes Plugin

```typescript
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'discount-codes',
  version: '1.0.0',
  type: 'general',
  description: 'Add discount code functionality',
  author: 'ForkCart',
  keywords: ['discount', 'coupon', 'promo'],

  settings: {
    maxUsesPerCode: { type: 'number', label: 'Max Uses', default: 100 },
    allowStacking: { type: 'boolean', label: 'Allow Stacking', default: false },
  },

  permissions: ['orders:read', 'orders:write'],

  filters: {
    'cart:total': (total, ctx) => {
      // Apply discount logic
      return total;
    },
  },

  hooks: {
    'order:created': async (event, ctx) => {
      // Track discount usage
    },
  },

  routes: (router) => {
    router.post('/validate', async (c) => {
      const { code } = await c.req.json();
      // Validate discount code
      return c.json({ valid: true, discount: 10 });
    });
  },

  adminPages: [{ path: '/discounts', label: 'Discount Codes', icon: 'tag' }],

  cli: [
    {
      name: 'create',
      description: 'Create a discount code',
      handler: async (args, ctx) => {
        ctx.logger.info('Creating code...');
      },
    },
  ],

  migrations: [
    {
      version: '1.0.0',
      description: 'Create discount_codes table',
      up: async (db) => {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS discount_codes (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            percent INTEGER NOT NULL,
            max_uses INTEGER DEFAULT 100,
            current_uses INTEGER DEFAULT 0,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
      },
      down: async (db) => {
        await db.execute('DROP TABLE IF EXISTS discount_codes;');
      },
    },
  ],

  onInstall: async (ctx) => {
    ctx.logger.info('Discount codes plugin installed!');
  },
});
```

---

## Publishing

### To the ForkCart Plugin Marketplace

Your ZIP must contain:

```
my-plugin/
├── forkcart-plugin.json  ← Required manifest
├── package.json          ← Required
├── README.md             ← Required
├── dist/                 ← Compiled JS
│   └── index.js
└── src/                  ← Source (optional)
    └── index.ts
```

**Example `forkcart-plugin.json`:**

```json
{
  "name": "Social Proof",
  "slug": "social-proof",
  "packageName": "forkcart-plugin-social-proof",
  "version": "1.0.0",
  "type": "general",
  "description": "Display real-time social proof on product pages",
  "author": "Tyto 🦉",
  "license": "MIT",
  "minForkcartVersion": "0.5.0",
  "entryPoint": "dist/index.js"
}
```

**Upload steps:**

1. Build your plugin: `pnpm build`
2. Create ZIP with all required files
3. Go to [ForkCart Developer Portal](https://developers.forkcart.com)
4. Upload your ZIP
5. Set pricing (free or paid — ForkCart takes 10%, you keep 90%)

### As npm Package

```json
{
  "name": "forkcart-plugin-my-awesome",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@forkcart/plugin-sdk": "^0.1.0"
  }
}
```

### Installing

**From Admin UI:**

1. Go to **Plugins** → **Marketplace**
2. Search and click **Install**

**From CLI:**

```bash
forkcart plugin install forkcart-plugin-my-awesome
forkcart plugin activate my-awesome
```

---

## Best Practices

1. **Use TypeScript** — Better DX and catches errors early
2. **Handle errors gracefully** — Don't crash the main app
3. **Use the settings schema** — Don't hardcode configuration
4. **Document your plugin** — Include a README.md
5. **Test thoroughly** — Especially payment/order flows
6. **Version your migrations** — Never modify existing ones
7. **Declare permissions** — Only request what you need
8. **Clean up on uninstall** — Remove data when plugin is removed

---

## Need Help?

- [GitHub Issues](https://github.com/forkcart/forkcart/issues)
- [Discord Community](https://discord.gg/forkcart)
- [API Documentation](./API.md)
