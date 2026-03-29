import { definePlugin } from '@forkcart/plugin-sdk';
import type {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentWebhookEvent,
  PaymentStatus,
  PaymentProviderClientConfig,
} from '@forkcart/plugin-sdk';
import Stripe from 'stripe';

let stripe: Stripe | null = null;
let webhookSecret = '';
let publishableKey = '';
let configured = false;

const settings = {
  stripeSecretKey: {
    type: 'string' as const,
    required: true,
    secret: true,
    label: 'Secret Key',
    description: 'Stripe secret key (sk_live_... or sk_test_...)',
    placeholder: 'sk_live_...',
  },
  stripePublishableKey: {
    type: 'string' as const,
    required: true,
    label: 'Publishable Key',
    description: 'Stripe publishable key for the frontend',
    placeholder: 'pk_live_...',
  },
  stripeWebhookSecret: {
    type: 'string' as const,
    required: true,
    secret: true,
    label: 'Webhook Secret',
    description: 'Signing secret from your Stripe webhook endpoint',
    placeholder: 'whsec_...',
  },
};

export default definePlugin({
  name: 'stripe-payments',
  version: '1.0.0',
  type: 'payment',
  description:
    'Accept credit card payments via Stripe. Supports one-time payments, 3D Secure, and automatic webhook handling.',
  author: 'ForkCart',
  license: 'MIT',
  keywords: ['payment', 'stripe', 'credit-card', '3d-secure'],
  minVersion: '1.0.0',

  settings,

  permissions: ['payments:process', 'orders:read', 'orders:write', 'webhooks:manage'],

  storefrontComponents: {
    StripePayment: './components/StripePayment.tsx',
  },

  async onActivate(ctx) {
    ctx.logger.info('Stripe Payments plugin activated');
  },

  async onDeactivate(ctx) {
    stripe = null;
    configured = false;
    ctx.logger.info('Stripe Payments plugin deactivated');
  },

  provider: {
    webhookHeaders: ['stripe-signature'],

    async initialize(s: Record<string, unknown>) {
      const secretKey = s.stripeSecretKey as string;
      webhookSecret = s.stripeWebhookSecret as string;
      publishableKey = s.stripePublishableKey as string;

      if (!secretKey) {
        configured = false;
        return;
      }

      stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
      configured = true;
    },

    isConfigured(): boolean {
      return configured && stripe !== null;
    },

    getClientConfig(): PaymentProviderClientConfig {
      return {
        provider: 'stripe',
        displayName: 'Credit Card (Stripe)',
        componentType: 'stripe-payment-element',
        pluginSlug: 'stripe-payments',
        componentName: 'StripePayment',
        clientConfig: {
          publishableKey,
        },
      };
    },

    async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
      if (!stripe) throw new Error('Stripe not initialized');

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: input.customer.email,
        line_items: [
          {
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: Math.round(input.amount * 100),
              product_data: {
                name: `Order for ${input.customer.firstName} ${input.customer.lastName}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: input.metadata,
        success_url: input.metadata.successUrl || '{CHECKOUT_SESSION_URL}',
        cancel_url: input.metadata.cancelUrl || '{CHECKOUT_SESSION_URL}',
      });

      return {
        clientSecret: session.client_secret || session.id,
        externalId: session.id,
        amount: input.amount,
        currency: input.currency,
        clientData: {
          sessionId: session.id,
          url: session.url,
          publishableKey,
        },
      };
    },

    async verifyWebhook(
      rawBody: string,
      headers: Record<string, string>,
    ): Promise<PaymentWebhookEvent> {
      if (!stripe) throw new Error('Stripe not initialized');

      const sig = headers['stripe-signature'];
      if (!sig) throw new Error('Missing stripe-signature header');

      const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          type: 'payment.succeeded',
          externalId: session.id,
          amount: (session.amount_total || 0) / 100,
          currency: (session.currency || 'eur').toUpperCase(),
          metadata: (session.metadata as Record<string, string>) || {},
          rawEvent: event,
        };
      }

      if (event.type === 'charge.refunded') {
        const charge = event.data.object as Stripe.Charge;
        return {
          type: 'payment.refunded',
          externalId: charge.payment_intent as string,
          amount: (charge.amount_refunded || 0) / 100,
          currency: (charge.currency || 'eur').toUpperCase(),
          metadata: (charge.metadata as Record<string, string>) || {},
          rawEvent: event,
        };
      }

      if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object as Stripe.PaymentIntent;
        return {
          type: 'payment.failed',
          externalId: pi.id,
          amount: pi.amount / 100,
          currency: pi.currency.toUpperCase(),
          metadata: (pi.metadata as Record<string, string>) || {},
          rawEvent: event,
          errorMessage: pi.last_payment_error?.message,
        };
      }

      throw new Error(`Unhandled Stripe event type: ${event.type}`);
    },

    async getPaymentStatus(externalId: string): Promise<PaymentStatus> {
      if (!stripe) throw new Error('Stripe not initialized');

      // Handle both checkout session IDs and payment intent IDs
      if (externalId.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(externalId);
        const statusMap: Record<string, PaymentStatus['status']> = {
          complete: 'succeeded',
          expired: 'cancelled',
          open: 'pending',
        };
        return {
          status: statusMap[session.status || 'open'] || 'pending',
          externalId,
          amount: (session.amount_total || 0) / 100,
          currency: (session.currency || 'eur').toUpperCase(),
        };
      }

      const pi = await stripe.paymentIntents.retrieve(externalId);
      const statusMap: Record<string, PaymentStatus['status']> = {
        succeeded: 'succeeded',
        processing: 'processing',
        requires_payment_method: 'pending',
        requires_confirmation: 'pending',
        requires_action: 'pending',
        canceled: 'cancelled',
        requires_capture: 'processing',
      };
      return {
        status: statusMap[pi.status] || 'pending',
        externalId,
        amount: pi.amount / 100,
        currency: pi.currency.toUpperCase(),
      };
    },
  },

  routes(router) {
    router.post('/webhook', async (c: any) => {
      // Webhook endpoint is handled by ForkCart core's payment webhook router
      // This route is here for documentation — actual verification goes through provider.verifyWebhook
      return c.json({ received: true });
    });
  },

  hooks: {
    'order:refunded': async (event, ctx) => {
      ctx.logger.info('Order refunded via Stripe', { orderId: event.payload.orderId });
    },
  },
});
