# ForkCart Plugin Development Guide

Build plugins that extend ForkCart's functionality — payment providers, marketplaces, email services, and custom features.

## Quick Start

### 1. Create Your Plugin

```bash
mkdir packages/plugins/my-awesome-plugin
cd packages/plugins/my-awesome-plugin
npm init -y
```

### 2. Define Your Plugin

```typescript
// src/index.ts
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'my-awesome-plugin',
  version: '1.0.0',
  displayName: 'My Awesome Plugin',
  description: 'Does awesome things',
  author: 'Your Name',
  type: 'feature', // 'payment' | 'marketplace' | 'email' | 'shipping' | 'feature'

  // Settings schema (auto-generates admin UI)
  settings: {
    apiKey: { type: 'string', required: true, secret: true },
    enabled: { type: 'boolean', default: true },
  },

  // React to events
  events: {
    'order:created': async (order, ctx) => {
      console.log('New order!', order.id);
    },
  },
});
```

### 3. Register Your Plugin

Add to `packages/api/src/app.ts`:

```typescript
import myPlugin from '@forkcart/plugin-my-awesome-plugin';

// In the startup section:
await pluginLoader.registerSdkPlugin(myPlugin);
```

---

## Plugin Types

### Payment Provider

```typescript
import { definePlugin, PaymentProvider } from '@forkcart/plugin-sdk';

const stripeProvider: PaymentProvider = {
  id: 'stripe',
  name: 'Stripe',

  async createPaymentIntent(amount, currency, metadata) {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata,
    });
    return {
      clientSecret: intent.client_secret!,
      paymentIntentId: intent.id,
    };
  },

  async capturePayment(paymentIntentId) {
    const intent = await stripe.paymentIntents.capture(paymentIntentId);
    return { success: intent.status === 'succeeded' };
  },

  async refundPayment(paymentIntentId, amount) {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });
    return { success: true };
  },

  getClientConfig() {
    return { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY! };
  },
};

export default definePlugin({
  name: 'stripe',
  type: 'payment',
  settings: {
    secretKey: { type: 'string', required: true, secret: true },
    publishableKey: { type: 'string', required: true },
    webhookSecret: { type: 'string', secret: true },
  },
  paymentProvider: stripeProvider,
});
```

### Marketplace Provider

```typescript
import { definePlugin, MarketplaceProvider } from '@forkcart/plugin-sdk';

const amazonProvider: MarketplaceProvider = {
  id: 'amazon',
  name: 'Amazon',

  async connect(credentials) {
    // Validate credentials, return connection info
    return { success: true, sellerId: '...' };
  },

  async listProduct(product, connection) {
    // Push product to Amazon
    return { externalId: 'ASIN123', url: 'https://amazon.com/...' };
  },

  async fetchOrders(connection, since) {
    // Pull orders from Amazon
    return [{ externalId: '...', items: [...], total: 99.99 }];
  },

  async updateInventory(sku, quantity, connection) {
    // Sync inventory
    return { success: true };
  },
};

export default definePlugin({
  name: 'amazon',
  type: 'marketplace',
  settings: {
    sellerId: { type: 'string', required: true },
    mwsAccessKey: { type: 'string', required: true, secret: true },
    mwsSecretKey: { type: 'string', required: true, secret: true },
    region: {
      type: 'select',
      options: ['NA', 'EU', 'FE'],
      default: 'EU',
    },
  },
  marketplaceProvider: amazonProvider,
});
```

### Email Provider

```typescript
import { definePlugin, EmailProvider } from '@forkcart/plugin-sdk';

const mailgunProvider: EmailProvider = {
  id: 'mailgun',
  name: 'Mailgun',

  async sendEmail(to, subject, html, options) {
    await mailgun.messages.create(domain, {
      from: options?.from || 'noreply@example.com',
      to,
      subject,
      html,
    });
    return { success: true, messageId: '...' };
  },

  getRequiredSettings() {
    return [
      { key: 'apiKey', label: 'API Key', type: 'string', secret: true },
      { key: 'domain', label: 'Domain', type: 'string' },
    ];
  },
};

export default definePlugin({
  name: 'mailgun',
  type: 'email',
  settings: {
    apiKey: { type: 'string', required: true, secret: true },
    domain: { type: 'string', required: true },
    region: { type: 'select', options: ['US', 'EU'], default: 'US' },
  },
  emailProvider: mailgunProvider,
});
```

---

## Plugin Features

### Settings Schema

Define settings that auto-generate admin UI forms:

```typescript
settings: {
  // Text input
  apiKey: { type: 'string', required: true },

  // Password/secret field (masked in UI)
  secretKey: { type: 'string', required: true, secret: true },

  // Checkbox
  sandboxMode: { type: 'boolean', default: false },

  // Number input
  timeout: { type: 'number', default: 30 },

  // Dropdown
  region: {
    type: 'select',
    options: ['US', 'EU', 'APAC'],
    default: 'US',
  },
}
```

### Event Hooks

React to system events:

```typescript
events: {
  // Order lifecycle
  'order:created': async (order, ctx) => { },
  'order:paid': async (order, ctx) => { },
  'order:shipped': async (order, ctx) => { },
  'order:completed': async (order, ctx) => { },
  'order:cancelled': async (order, ctx) => { },
  'order:refunded': async (order, ctx) => { },

  // Product events
  'product:created': async (product, ctx) => { },
  'product:updated': async (product, ctx) => { },
  'product:deleted': async (product, ctx) => { },

  // Cart events
  'cart:item-added': async (cartItem, ctx) => { },
  'cart:item-removed': async (cartItem, ctx) => { },
  'cart:cleared': async (cart, ctx) => { },

  // Customer events
  'customer:registered': async (customer, ctx) => { },
  'customer:updated': async (customer, ctx) => { },

  // Checkout events
  'checkout:started': async (checkout, ctx) => { },
  'checkout:completed': async (checkout, ctx) => { },

  // Inventory events
  'inventory:low-stock': async (product, ctx) => { },
  'inventory:out-of-stock': async (product, ctx) => { },

  // Plugin events
  'plugin:activated': async (pluginName, ctx) => { },
  'plugin:deactivated': async (pluginName, ctx) => { },
}
```

### Filters (Data Transformation)

Transform data as it flows through the system (like WordPress `apply_filters`):

```typescript
filters: {
  // Modify product price (e.g., for discounts)
  'product:price': (price, { product }) => {
    if (product.tags?.includes('sale')) {
      return price * 0.9; // 10% off
    }
    return price;
  },

  // Filter search results
  'search:results': (results, { query }) => {
    return results.filter(p => p.isAvailable);
  },

  // Modify cart totals
  'cart:totals': (totals, { cart }) => {
    if (cart.items.length >= 5) {
      totals.discount += 10; // Bulk discount
    }
    return totals;
  },

  // Adjust shipping rates
  'shipping:rates': (rates, { address, cart }) => {
    if (cart.total >= 100) {
      return rates.map(r => ({ ...r, price: 0 })); // Free shipping
    }
    return rates;
  },

  // Modify tax calculation
  'tax:amount': (tax, { address, subtotal }) => {
    if (address.country === 'US' && address.state === 'OR') {
      return 0; // Oregon has no sales tax
    }
    return tax;
  },
}
```

### Storefront Slots

Inject HTML into the storefront:

```typescript
storefrontSlots: [
  {
    slot: 'header-after',
    content: '<div class="announcement-bar">Free shipping on orders over $50!</div>',
  },
  {
    slot: 'product-page-bottom',
    content: '<img src="https://example.com/trust-badge.png" alt="Trusted Shop" />',
    pages: ['/product/*'], // Only on product pages
  },
  {
    slot: 'footer-before',
    content: '<script src="https://example.com/chat-widget.js"></script>',
  },
]
```

**Available slots:**
- `header-before`, `header-after`
- `footer-before`, `footer-after`
- `product-page-top`, `product-page-bottom`
- `cart-page-top`, `cart-page-bottom`
- `checkout-before`, `checkout-after`

### CLI Commands

Add custom CLI commands:

```typescript
cli: [
  {
    name: 'sync',
    description: 'Sync products to marketplace',
    handler: async (args, ctx) => {
      console.log('Syncing...');
      // Your sync logic
    },
  },
  {
    name: 'report',
    description: 'Generate sales report',
    handler: async (args, ctx) => {
      const { from, to } = args;
      // Generate report
    },
  },
]
```

Run with: `forkcart plugin run my-plugin:sync`

### Scheduled Tasks (Cron)

Run tasks on a schedule:

```typescript
scheduledTasks: [
  {
    name: 'daily-sync',
    schedule: '0 3 * * *', // 3 AM daily
    handler: async (ctx) => {
      await syncInventory();
    },
  },
  {
    name: 'hourly-check',
    schedule: '0 * * * *', // Every hour
    handler: async (ctx) => {
      await checkOrderStatus();
    },
  },
]
```

### Lifecycle Hooks

Run code when plugin is installed/uninstalled:

```typescript
onInstall: async (ctx) => {
  // Run migrations, create default settings
  console.log('Plugin installed!');
},

onUninstall: async (ctx) => {
  // Cleanup data
  console.log('Plugin uninstalled!');
},

onActivate: async (ctx) => {
  // Start background tasks
},

onDeactivate: async (ctx) => {
  // Stop background tasks
},
```

### Database Migrations

Add custom tables:

```typescript
migrations: [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS my_plugin_data (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL,
        value JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `,
    down: `DROP TABLE IF EXISTS my_plugin_data;`,
  },
]
```

---

## Full Example: Discount Code Plugin

```typescript
import { definePlugin } from '@forkcart/plugin-sdk';

export default definePlugin({
  name: 'discount-codes',
  version: '1.0.0',
  displayName: 'Discount Codes',
  description: 'Add discount code functionality to your store',
  author: 'ForkCart Team',
  type: 'feature',

  settings: {
    maxUsesPerCode: { type: 'number', default: 100 },
    allowStacking: { type: 'boolean', default: false },
  },

  // Transform cart totals when discount applied
  filters: {
    'cart:totals': (totals, { cart }) => {
      const code = cart.metadata?.discountCode;
      if (code) {
        // Apply discount logic
        totals.discount += calculateDiscount(code, totals.subtotal);
      }
      return totals;
    },
  },

  // Track discount usage
  events: {
    'order:created': async (order, ctx) => {
      const code = order.metadata?.discountCode;
      if (code) {
        await incrementCodeUsage(code);
      }
    },
  },

  // CLI for managing codes
  cli: [
    {
      name: 'create',
      description: 'Create a discount code',
      handler: async ({ code, percent, expires }) => {
        await createDiscountCode(code, percent, expires);
        console.log(`Created code: ${code}`);
      },
    },
    {
      name: 'list',
      description: 'List all discount codes',
      handler: async () => {
        const codes = await listDiscountCodes();
        console.table(codes);
      },
    },
  ],

  // Database for storing codes
  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS discount_codes (
          id SERIAL PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          percent INTEGER NOT NULL,
          max_uses INTEGER DEFAULT 100,
          current_uses INTEGER DEFAULT 0,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `,
      down: `DROP TABLE IF EXISTS discount_codes;`,
    },
  ],

  onInstall: async () => {
    console.log('Discount Codes plugin installed!');
  },
});
```

---

## Publishing Your Plugin

### As npm Package

1. Name your package: `forkcart-plugin-{name}` or `@yourorg/forkcart-plugin-{name}`
2. Export the plugin as default
3. Publish to npm

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

### Installing Plugins

From Admin UI:
1. Go to **Plugins** → **Marketplace**
2. Search for the plugin
3. Click **Install**

From CLI:
```bash
forkcart plugin install forkcart-plugin-my-awesome
forkcart plugin activate my-awesome
```

---

## API Reference

### Plugin Context

Every handler receives a context object:

```typescript
interface PluginContext {
  db: Database;           // Database connection
  settings: Settings;     // Plugin settings
  logger: Logger;         // Logging utility
  eventBus: EventBus;     // Emit events
}
```

### Event Bus

Emit custom events:

```typescript
events: {
  'order:created': async (order, ctx) => {
    // Emit custom event
    ctx.eventBus.emit('myPlugin:order-processed', {
      orderId: order.id,
      timestamp: new Date(),
    });
  },
}
```

---

## Best Practices

1. **Use TypeScript** — Better DX and catches errors early
2. **Handle errors gracefully** — Don't crash the main app
3. **Use settings** — Don't hardcode configuration
4. **Document your plugin** — Include a README.md
5. **Test thoroughly** — Especially payment/order flows
6. **Version your migrations** — Never modify existing migrations
7. **Clean up on uninstall** — Remove data when plugin is removed

---

## Need Help?

- [GitHub Issues](https://github.com/forkcart/forkcart/issues)
- [Discord Community](https://discord.gg/forkcart)
- [API Documentation](./API.md)
