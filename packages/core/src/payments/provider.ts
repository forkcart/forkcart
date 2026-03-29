/**
 * Payment Provider Interface — the contract every payment plugin must implement.
 * Stripe, PayPal, Klarna, etc. all implement this.
 */

/** Result from creating a payment intent/session */
export interface PaymentIntentResult {
  /** Provider-specific client secret or session ID for frontend */
  clientSecret: string;
  /** Provider-specific payment intent/session ID */
  externalId: string;
  /** Amount in cents */
  amount: number;
  /** ISO currency code */
  currency: string;
  /** Extra data the frontend needs (e.g. Stripe publishable key) */
  clientData?: Record<string, unknown>;
}

/** Input for creating a payment intent */
export interface PaymentIntentInput {
  /** Amount in cents */
  amount: number;
  /** ISO currency code */
  currency: string;
  /** Customer info */
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  /** Shipping address */
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    country: string;
  };
  /** Arbitrary metadata (cartId, orderId, etc.) */
  metadata: Record<string, string>;
}

/** Webhook verification + parsing result */
export interface WebhookEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded';
  externalId: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  rawEvent: unknown;
  errorMessage?: string;
}

/** Payment status from the provider */
export interface PaymentStatus {
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  externalId: string;
  amount: number;
  currency: string;
}

/** What the frontend needs to render the payment form */
export interface PaymentProviderClientConfig {
  /** Provider identifier (stripe, paypal, etc.) */
  provider: string;
  /** Display name */
  displayName: string;
  /** Any keys/config the frontend needs (e.g. publishable key, client ID) */
  clientConfig: Record<string, unknown>;
  /** Which frontend component to render */
  componentType: string;
  /** Plugin slug for dynamic component loading */
  pluginSlug?: string;
  /** Component name exported by the plugin */
  componentName?: string;
}

/**
 * The contract every payment provider plugin must implement.
 */
export interface PaymentProvider {
  /** Unique identifier (e.g. 'stripe', 'paypal') */
  readonly id: string;
  /** Display name (e.g. 'Stripe', 'PayPal') */
  readonly displayName: string;

  /** HTTP headers that identify this provider's webhooks (e.g. ['stripe-signature']) */
  readonly webhookHeaders?: string[];

  /** Initialize the provider with settings from the DB */
  initialize(settings: Record<string, unknown>): Promise<void>;

  /** Check if the provider is properly configured */
  isConfigured(): boolean;

  /** Get configuration needed by the frontend */
  getClientConfig(): PaymentProviderClientConfig;

  /** Create a payment intent/session */
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;

  /** Verify and parse a webhook payload */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent>;

  /** Get payment status from provider */
  getPaymentStatus(externalId: string): Promise<PaymentStatus>;

  /** Required settings keys for admin UI */
  getRequiredSettings(): PaymentProviderSettingDef[];
}

/** Defines a setting field for admin UI */
export interface PaymentProviderSettingDef {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
}
