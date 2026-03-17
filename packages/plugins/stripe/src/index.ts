import { definePlugin } from '@forkcart/plugin-sdk';
import { StripePaymentProvider } from './provider';

const provider = new StripePaymentProvider();

const stripePluginDef = definePlugin({
  name: 'stripe',
  version: '0.1.0',
  type: 'payment',
  description:
    'Accept payments via Stripe — credit cards, Apple Pay, Google Pay, SEPA, and 40+ payment methods.',
  author: 'ForkCart',

  settings: {
    secretKey: {
      type: 'string',
      label: 'Secret Key',
      secret: true,
      required: true,
      placeholder: 'sk_live_...',
      description: 'Your Stripe secret key (starts with sk_live_ or sk_test_)',
    },
    publishableKey: {
      type: 'string',
      label: 'Publishable Key',
      required: true,
      placeholder: 'pk_live_...',
      description: 'Your Stripe publishable key (starts with pk_live_ or pk_test_)',
    },
    webhookSecret: {
      type: 'string',
      label: 'Webhook Secret',
      secret: true,
      placeholder: 'whsec_...',
      description: 'Webhook signing secret for verifying Stripe events',
    },
  },

  async onActivate(ctx) {
    await provider.initialize(ctx.settings as unknown as Record<string, unknown>);
    ctx.logger.info('Stripe payment provider activated');
  },

  provider: {
    initialize: (settings: Record<string, unknown>) => provider.initialize(settings),
    isConfigured: () => provider.isConfigured(),
    getClientConfig: () => provider.getClientConfig() as never,
    createPaymentIntent: (input) =>
      provider.createPaymentIntent(input as Parameters<typeof provider.createPaymentIntent>[0]),
    verifyWebhook: (rawBody: string, headers: Record<string, string>) =>
      provider.verifyWebhook(rawBody, headers),
    getPaymentStatus: (externalId: string) => provider.getPaymentStatus(externalId),
  },
});

export default stripePluginDef;

/** @deprecated Use default export instead */
export const stripePlugin = stripePluginDef;

export { StripePaymentProvider } from './provider';
