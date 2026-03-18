import type Stripe from 'stripe';
import type {
  PaymentProvider,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProviderClientConfig,
  PaymentProviderSettingDef,
  WebhookEvent,
  PaymentStatus,
} from '@forkcart/core';

/**
 * Stripe Payment Provider — implements the PaymentProvider interface.
 * All Stripe-specific logic is encapsulated here.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly id = 'stripe';
  readonly displayName = 'Stripe';

  private stripe: Stripe | null = null;
  private secretKey = '';
  private webhookSecret = '';
  private publishableKey = '';

  async initialize(settings: Record<string, unknown>): Promise<void> {
    this.secretKey = (settings['secretKey'] as string) ?? '';
    this.webhookSecret = (settings['webhookSecret'] as string) ?? '';
    this.publishableKey = (settings['publishableKey'] as string) ?? '';

    if (this.secretKey) {
      const { default: StripeSDK } = await import('stripe');
      this.stripe = new StripeSDK(this.secretKey);
    }
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey && this.publishableKey && this.stripe);
  }

  getClientConfig(): PaymentProviderClientConfig {
    return {
      provider: this.id,
      displayName: this.displayName,
      componentType: 'stripe-payment-element',
      clientConfig: {
        publishableKey: this.publishableKey,
      },
    };
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    if (!this.stripe) throw new Error('Stripe not initialized');

    // Create or reuse Stripe customer
    const stripeCustomer = await this.stripe.customers.create({
      email: input.customer.email,
      name: `${input.customer.firstName} ${input.customer.lastName}`,
      metadata: { forkcartCustomerId: input.customer.id },
    });

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency,
      customer: stripeCustomer.id,
      metadata: input.metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      externalId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      clientData: {
        publishableKey: this.publishableKey,
      },
    };
  }

  async verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent> {
    if (!this.stripe) throw new Error('Stripe not initialized');

    const signature = headers['stripe-signature'];
    if (!signature) throw new Error('Missing stripe-signature header');

    let event: Stripe.Event;

    if (this.webhookSecret) {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } else if (process.env.NODE_ENV === 'production') {
      // RVS-026: Reject unverified webhooks in production
      throw new Error(
        'Stripe webhookSecret is not configured. Webhook verification is required in production.',
      );
    } else {
      // Dev mode: parse without verification
      event = JSON.parse(rawBody) as Stripe.Event;
    }

    const obj = event.data.object as unknown as Record<string, unknown>;
    const metadata = (obj['metadata'] as Record<string, string>) ?? {};

    switch (event.type) {
      case 'payment_intent.succeeded':
        return {
          type: 'payment.succeeded',
          externalId: obj['id'] as string,
          amount: obj['amount'] as number,
          currency: (obj['currency'] as string).toUpperCase(),
          metadata,
          rawEvent: event,
        };

      case 'payment_intent.payment_failed': {
        const lastError = obj['last_payment_error'] as Record<string, string> | undefined;
        return {
          type: 'payment.failed',
          externalId: obj['id'] as string,
          amount: obj['amount'] as number,
          currency: (obj['currency'] as string).toUpperCase(),
          metadata,
          rawEvent: event,
          errorMessage: lastError?.message,
        };
      }

      case 'charge.refunded':
        return {
          type: 'payment.refunded',
          externalId: obj['payment_intent'] as string,
          amount: obj['amount_refunded'] as number,
          currency: (obj['currency'] as string).toUpperCase(),
          metadata,
          rawEvent: event,
        };

      default:
        throw new Error(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  async getPaymentStatus(externalId: string): Promise<PaymentStatus> {
    if (!this.stripe) throw new Error('Stripe not initialized');

    const pi = await this.stripe.paymentIntents.retrieve(externalId);

    const statusMap: Record<string, PaymentStatus['status']> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      succeeded: 'succeeded',
      canceled: 'cancelled',
      requires_capture: 'processing',
    };

    return {
      status: statusMap[pi.status] ?? 'pending',
      externalId: pi.id,
      amount: pi.amount,
      currency: pi.currency.toUpperCase(),
    };
  }

  getRequiredSettings(): PaymentProviderSettingDef[] {
    return [
      {
        key: 'secretKey',
        label: 'Secret Key',
        type: 'password',
        required: true,
        placeholder: 'sk_live_...',
        description: 'Your Stripe secret key (starts with sk_live_ or sk_test_)',
      },
      {
        key: 'publishableKey',
        label: 'Publishable Key',
        type: 'text',
        required: true,
        placeholder: 'pk_live_...',
        description: 'Your Stripe publishable key (starts with pk_live_ or pk_test_)',
      },
      {
        key: 'webhookSecret',
        label: 'Webhook Secret',
        type: 'password',
        required: false,
        placeholder: 'whsec_...',
        description: 'Webhook signing secret for verifying Stripe events',
      },
    ];
  }
}
