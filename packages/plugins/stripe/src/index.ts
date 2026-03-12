import type { PluginDefinition } from '@forkcart/core';
import { StripePaymentProvider } from './provider';

/** Stripe plugin definition for the PluginLoader */
export const stripePlugin: PluginDefinition = {
  name: 'stripe',
  version: '0.1.0',
  description:
    'Accept payments via Stripe — credit cards, Apple Pay, Google Pay, SEPA, and 40+ payment methods.',
  author: 'ForkCart',
  type: 'payment',
  createProvider: () => new StripePaymentProvider(),
  defaultSettings: {
    secretKey: '',
    publishableKey: '',
    webhookSecret: '',
  },
};

export { StripePaymentProvider } from './provider';
