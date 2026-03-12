/**
 * Email Provider Interface — the contract every email plugin must implement.
 * Mailgun, SendGrid, SES, etc. all implement this.
 */

/** Result from sending an email */
export interface EmailSendResult {
  /** Provider-specific message ID */
  messageId: string;
  /** Whether the send was accepted (queued) */
  accepted: boolean;
}

/** Input for sending an email */
export interface EmailSendInput {
  /** Recipient email address */
  to: string;
  /** Email subject */
  subject: string;
  /** HTML body */
  html: string;
  /** Plain text fallback */
  text?: string;
  /** Reply-to address */
  replyTo?: string;
  /** Custom headers */
  headers?: Record<string, string>;
}

/** Setting definition for admin UI */
export interface EmailProviderSettingDef {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
  placeholder?: string;
  description?: string;
}

/**
 * Every email provider plugin implements this interface.
 */
export interface EmailProvider {
  /** Unique provider identifier */
  readonly id: string;
  /** Human-readable name */
  readonly displayName: string;

  /** Initialize with settings from DB */
  initialize(settings: Record<string, unknown>): Promise<void>;

  /** Check if the provider is properly configured */
  isConfigured(): boolean;

  /** Send an email */
  sendEmail(input: EmailSendInput): Promise<EmailSendResult>;

  /** Get required settings for admin UI */
  getRequiredSettings(): EmailProviderSettingDef[];
}
