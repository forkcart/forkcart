import { createLogger } from '../lib/logger';
import type { EmailProviderRegistry } from './registry';
import type { EmailSendResult } from './provider';
import type { EmailLogRepository, EmailLogEntry } from './log-repository';
import {
  orderConfirmationHtml,
  orderConfirmationText,
  orderShippedHtml,
  orderShippedText,
  orderDeliveredHtml,
  orderDeliveredText,
  welcomeHtml,
  welcomeText,
  passwordResetHtml,
  passwordResetText,
} from './templates/index';
import type {
  OrderConfirmationData,
  OrderShippedData,
  OrderDeliveredData,
  WelcomeData,
  PasswordResetData,
} from './templates/index';

const logger = createLogger('email-service');

export interface EmailServiceDeps {
  emailRegistry: EmailProviderRegistry;
  emailLogRepository: EmailLogRepository;
}

/**
 * Orchestrates email template rendering + sending via the active provider.
 * Logs every sent email for the admin panel.
 */
export class EmailService {
  private readonly registry: EmailProviderRegistry;
  private readonly logRepo: EmailLogRepository;

  constructor(deps: EmailServiceDeps) {
    this.registry = deps.emailRegistry;
    this.logRepo = deps.emailLogRepository;
  }

  /** Send a raw email (for test emails or custom sends) */
  async sendRaw(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<EmailSendResult> {
    const provider = this.registry.getActiveProvider();
    if (!provider) {
      throw new Error('No email provider configured. Activate a provider in Plugins.');
    }
    if (!provider.isConfigured()) {
      throw new Error(`Email provider "${provider.displayName}" is not fully configured.`);
    }

    const result = await provider.sendEmail({ to, subject, html, text });

    await this.logRepo.create({
      provider: provider.id,
      to,
      subject,
      template: 'raw',
      messageId: result.messageId,
      status: result.accepted ? 'sent' : 'failed',
    });

    logger.info({ to, subject, messageId: result.messageId }, 'Email sent');
    return result;
  }

  /** Send order confirmation email. locale param reserved for Phase 2 multi-language templates. */
  async sendOrderConfirmation(
    to: string,
    data: OrderConfirmationData,
    _locale: string = 'en',
  ): Promise<EmailSendResult> {
    const html = orderConfirmationHtml(data);
    const text = orderConfirmationText(data);
    return this.sendTemplated(
      to,
      `Order Confirmation ${data.orderNumber}`,
      html,
      text,
      'order-confirmation',
    );
  }

  /** Send order shipped email. locale param reserved for Phase 2 multi-language templates. */
  async sendOrderShipped(
    to: string,
    data: OrderShippedData,
    _locale: string = 'en',
  ): Promise<EmailSendResult> {
    const html = orderShippedHtml(data);
    const text = orderShippedText(data);
    return this.sendTemplated(
      to,
      `Your order ${data.orderNumber} has been shipped`,
      html,
      text,
      'order-shipped',
    );
  }

  /** Send order delivered email. locale param reserved for Phase 2 multi-language templates. */
  async sendOrderDelivered(
    to: string,
    data: OrderDeliveredData,
    _locale: string = 'en',
  ): Promise<EmailSendResult> {
    const html = orderDeliveredHtml(data);
    const text = orderDeliveredText(data);
    return this.sendTemplated(
      to,
      `Order ${data.orderNumber} delivered`,
      html,
      text,
      'order-delivered',
    );
  }

  /** Send welcome email. locale param reserved for Phase 2 multi-language templates. */
  async sendWelcome(
    to: string,
    data: WelcomeData,
    _locale: string = 'en',
  ): Promise<EmailSendResult> {
    const html = welcomeHtml(data);
    const text = welcomeText(data);
    return this.sendTemplated(to, 'Welcome!', html, text, 'welcome');
  }

  /** Send password reset email. locale param reserved for Phase 2 multi-language templates. */
  async sendPasswordReset(
    to: string,
    data: PasswordResetData,
    _locale: string = 'en',
  ): Promise<EmailSendResult> {
    const html = passwordResetHtml(data);
    const text = passwordResetText(data);
    return this.sendTemplated(to, 'Reset Your Password', html, text, 'password-reset');
  }

  /** Get email log entries */
  async getLog(limit: number = 50): Promise<EmailLogEntry[]> {
    return this.logRepo.findRecent(limit);
  }

  private async sendTemplated(
    to: string,
    subject: string,
    html: string,
    text: string,
    template: string,
  ): Promise<EmailSendResult> {
    const provider = this.registry.getActiveProvider();
    if (!provider) {
      throw new Error('No email provider configured. Activate a provider in Plugins.');
    }
    if (!provider.isConfigured()) {
      throw new Error(`Email provider "${provider.displayName}" is not fully configured.`);
    }

    const result = await provider.sendEmail({ to, subject, html, text });

    await this.logRepo.create({
      provider: provider.id,
      to,
      subject,
      template,
      messageId: result.messageId,
      status: result.accepted ? 'sent' : 'failed',
    });

    logger.info({ to, subject, template, messageId: result.messageId }, 'Templated email sent');
    return result;
  }
}
