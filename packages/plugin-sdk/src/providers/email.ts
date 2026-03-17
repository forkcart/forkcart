/** Result from sending an email */
export interface EmailSendResult {
  messageId: string;
  accepted: boolean;
}

/** Input for sending an email */
export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

/** Email provider interface for plugins */
export interface EmailProviderMethods {
  /** Initialize with settings from DB */
  initialize(settings: Record<string, unknown>): Promise<void>;
  /** Check if the provider is properly configured */
  isConfigured(): boolean;
  /** Send an email */
  sendEmail(input: EmailSendInput): Promise<EmailSendResult>;
}
