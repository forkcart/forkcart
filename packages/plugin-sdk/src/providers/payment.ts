/** Result from creating a payment intent/session */
export interface PaymentIntentResult {
  clientSecret: string;
  externalId: string;
  amount: number;
  currency: string;
  clientData?: Record<string, unknown>;
}

/** Input for creating a payment intent */
export interface PaymentIntentInput {
  amount: number;
  currency: string;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    country: string;
  };
  metadata: Record<string, string>;
}

/** Webhook event from a payment provider */
export interface PaymentWebhookEvent {
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

/** Defines a setting field for admin UI */
export interface ProviderSettingDef {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'number' | 'boolean';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
}

/** Client-side config for a payment provider */
export interface PaymentProviderClientConfig {
  /** Provider identifier (e.g. 'stripe', 'paypal') */
  provider: string;
  /** Display name for the UI */
  displayName: string;
  /** Which frontend component to render */
  componentType: string;
  /** Provider-specific config (e.g. publishable key) */
  clientConfig: Record<string, unknown>;
}

/** Payment provider interface for plugins */
export interface PaymentProviderMethods {
  /** Initialize with settings from DB */
  initialize(settings: Record<string, unknown>): Promise<void>;
  /** Check if the provider is properly configured */
  isConfigured(): boolean;
  /** Get configuration needed by the frontend */
  getClientConfig(): PaymentProviderClientConfig;
  /** Create a payment intent/session */
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  /** Verify and parse a webhook payload */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<PaymentWebhookEvent>;
  /** Get payment status from provider */
  getPaymentStatus(externalId: string): Promise<PaymentStatus>;
  /** Required settings for admin UI (optional — use settings schema in definePlugin instead) */
  getRequiredSettings?(): ProviderSettingDef[];
}
