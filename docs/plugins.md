# Plugin Development Guide

ForkCart is built around plugins. Payments, shipping, notifications, AI — everything beyond the core is a plugin. This guide walks you through building one.

## What is a Plugin?

A plugin is a self-contained TypeScript package that implements one of ForkCart's provider interfaces. It registers itself with the `PluginLoader`, gets activated through the admin panel, and stores its settings in the database.

**Plugin types:**

- `payment` — Payment providers (Stripe, PayPal, Klarna, etc.)
- `shipping` — Shipping calculators and carrier integrations
- `notification` — Email, SMS, push notifications
- `general` — Everything else (analytics, SEO, etc.)

## Plugin Structure

```
packages/plugins/your-plugin/
├── src/
│   ├── index.ts        # Plugin definition (entry point)
│   └── provider.ts     # Provider implementation
├── package.json
└── tsconfig.json
```

### package.json

```json
{
  "name": "@forkcart/plugin-your-plugin",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "@forkcart/core": "workspace:*"
  }
}
```

## Payment Provider Interface

Every payment plugin implements the `PaymentProvider` interface from `@forkcart/core`:

```typescript
interface PaymentProvider {
  readonly id: string; // e.g. 'paypal'
  readonly displayName: string; // e.g. 'PayPal'

  initialize(settings: Record<string, unknown>): Promise<void>;
  isConfigured(): boolean;
  getClientConfig(): PaymentProviderClientConfig;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent>;
  getPaymentStatus(externalId: string): Promise<PaymentStatus>;
  getRequiredSettings(): PaymentProviderSettingDef[];
}
```

### Key Types

```typescript
// What you return when creating a payment
interface PaymentIntentResult {
  clientSecret: string; // For the frontend to complete payment
  externalId: string; // Provider's payment ID
  amount: number; // Amount in cents
  currency: string; // ISO currency code
  clientData?: Record<string, unknown>; // Extra frontend config
}

// What you return from webhook verification
interface WebhookEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded';
  externalId: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  rawEvent: unknown;
}

// Settings field definition for the admin UI
interface PaymentProviderSettingDef {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  required: boolean;
  placeholder?: string;
  description?: string;
}
```

## Build a PayPal Plugin in 50 Lines

Here's a complete (simplified) PayPal plugin to show how little code it takes:

```typescript
// packages/plugins/paypal/src/provider.ts
import type {
  PaymentProvider,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProviderClientConfig,
  PaymentProviderSettingDef,
  WebhookEvent,
  PaymentStatus,
} from '@forkcart/core';

export class PayPalProvider implements PaymentProvider {
  readonly id = 'paypal';
  readonly displayName = 'PayPal';
  private clientId = '';
  private clientSecret = '';

  async initialize(settings: Record<string, unknown>) {
    this.clientId = (settings['clientId'] as string) ?? '';
    this.clientSecret = (settings['clientSecret'] as string) ?? '';
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  getClientConfig(): PaymentProviderClientConfig {
    return {
      provider: 'paypal',
      displayName: 'PayPal',
      componentType: 'paypal-buttons',
      clientConfig: { clientId: this.clientId },
    };
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    // Call PayPal Orders API to create an order
    const response = await fetch('https://api.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: input.currency.toUpperCase(),
              value: (input.amount / 100).toFixed(2),
            },
          },
        ],
      }),
    });
    const order = await response.json();
    return {
      clientSecret: order.id,
      externalId: order.id,
      amount: input.amount,
      currency: input.currency,
    };
  }

  async verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent> {
    const event = JSON.parse(rawBody);
    return {
      type:
        event.event_type === 'PAYMENT.CAPTURE.COMPLETED' ? 'payment.succeeded' : 'payment.failed',
      externalId: event.resource?.id ?? '',
      amount: Math.round(parseFloat(event.resource?.amount?.value ?? '0') * 100),
      currency: event.resource?.amount?.currency_code ?? 'USD',
      metadata: {},
      rawEvent: event,
    };
  }

  async getPaymentStatus(externalId: string): Promise<PaymentStatus> {
    return { status: 'pending', externalId, amount: 0, currency: 'USD' };
  }

  getRequiredSettings(): PaymentProviderSettingDef[] {
    return [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'AX...' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ];
  }
}
```

```typescript
// packages/plugins/paypal/src/index.ts
import type { PluginDefinition } from '@forkcart/core';
import { PayPalProvider } from './provider';

export const paypalPlugin: PluginDefinition = {
  name: 'paypal',
  version: '0.1.0',
  description: 'Accept payments via PayPal',
  author: 'ForkCart Community',
  type: 'payment',
  createProvider: () => new PayPalProvider(),
  defaultSettings: { clientId: '', clientSecret: '' },
};
```

## Registering Your Plugin

Add your plugin to the app startup in `packages/api/src/app.ts`:

```typescript
import { paypalPlugin } from '@forkcart/plugin-paypal';

// Inside createApp():
pluginLoader.registerDefinition(paypalPlugin);
```

That's it. The `PluginLoader` handles:

- Inserting the plugin into the database
- Loading settings from the DB
- Calling `initialize()` with those settings
- Registering the provider with the `PaymentProviderRegistry`

## Plugin Settings

Settings are defined via `defaultSettings` in the plugin definition and `getRequiredSettings()` in the provider. The admin panel renders a settings form automatically.

Settings are stored in the `plugin_settings` table. Secrets (keys containing "secret" or "key") are masked in the API response.

```typescript
defaultSettings: {
  apiKey: '',          // Will be masked in admin UI
  webhookSecret: '',   // Will be masked in admin UI
  sandboxMode: true,   // Shown as-is
},
```

## The EventBus

Plugins can react to domain events via the `EventBus`:

```typescript
eventBus.on('order.created', async (event) => {
  // Send confirmation email, update analytics, etc.
  console.log('New order:', event.payload);
});

eventBus.on('payment.succeeded', async (event) => {
  // Trigger fulfillment, notify warehouse, etc.
});
```

Available events:

- `product.created`, `product.updated`, `product.deleted`
- `order.created`, `order.status_changed`
- `payment.created`, `payment.succeeded`, `payment.failed`
- `customer.created`

## Testing Your Plugin

```typescript
import { describe, it, expect } from 'vitest';
import { PayPalProvider } from './provider';

describe('PayPalProvider', () => {
  it('should not be configured without credentials', () => {
    const provider = new PayPalProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('should be configured after initialization', async () => {
    const provider = new PayPalProvider();
    await provider.initialize({
      clientId: 'test-id',
      clientSecret: 'test-secret',
    });
    expect(provider.isConfigured()).toBe(true);
  });

  it('should return correct required settings', () => {
    const provider = new PayPalProvider();
    const settings = provider.getRequiredSettings();
    expect(settings).toHaveLength(2);
    expect(settings[0].key).toBe('clientId');
  });
});
```

## Shipping Provider Interface

> 🚧 **Coming soon.** The shipping provider interface is under development. It will follow the same pattern as payment providers — implement an interface, register via `PluginDefinition`, manage settings in the admin.

## AI Provider Interface

> 🚧 **Coming soon.** ForkCart's `packages/ai/` already supports OpenAI, Anthropic, and Ollama. The plugin interface will allow community-contributed AI integrations (local models, custom endpoints, etc.).

---

**Questions?** Open an issue or join our [Discord](https://discord.gg/forkcart). We're building the plugin ecosystem together! 🔌
