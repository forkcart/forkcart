import { createTransport, type Transporter } from 'nodemailer';
import type {
  EmailProvider,
  EmailSendInput,
  EmailSendResult,
  EmailProviderSettingDef,
} from '@forkcart/core';

/**
 * SMTP Email Provider — sends emails via any SMTP server using nodemailer.
 * Works with any standard SMTP service (Postfix, Gmail, Outlook, etc.).
 */
export class SmtpEmailProvider implements EmailProvider {
  readonly id = 'smtp';
  readonly displayName = 'SMTP';

  private host = '';
  private port = 587;
  private user = '';
  private pass = '';
  private fromAddress = '';
  private secure = false;
  private transporter: Transporter | null = null;

  async initialize(settings: Record<string, unknown>): Promise<void> {
    this.host = (settings['host'] as string) ?? '';
    this.port = Number(settings['port'] ?? 587);
    this.user = (settings['user'] as string) ?? '';
    this.pass = (settings['pass'] as string) ?? '';
    this.fromAddress = (settings['fromAddress'] as string) ?? '';
    this.secure = this.port === 465;

    if (this.isConfigured()) {
      this.transporter = createTransport({
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: {
          user: this.user,
          pass: this.pass,
        },
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.host && this.port && this.user && this.pass && this.fromAddress);
  }

  getRequiredSettings(): EmailProviderSettingDef[] {
    return [
      {
        key: 'host',
        label: 'SMTP Host',
        type: 'text',
        required: true,
        placeholder: 'smtp.example.com',
        description: 'SMTP server hostname',
      },
      {
        key: 'port',
        label: 'SMTP Port',
        type: 'text',
        required: true,
        placeholder: '587',
        description: 'SMTP port (587 for STARTTLS, 465 for SSL)',
      },
      {
        key: 'user',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'your@email.com',
        description: 'SMTP authentication username',
      },
      {
        key: 'pass',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: '••••••••',
        description: 'SMTP authentication password',
      },
      {
        key: 'fromAddress',
        label: 'From Address',
        type: 'text',
        required: true,
        placeholder: 'shop@yourdomain.com',
        description: 'Default sender email address',
      },
    ];
  }

  async sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
    if (!this.isConfigured() || !this.transporter) {
      throw new Error('SMTP provider is not configured');
    }

    const info = await this.transporter.sendMail({
      from: this.fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      headers: input.headers,
    });

    return {
      messageId: info.messageId ?? `smtp-${Date.now()}`,
      accepted: true,
    };
  }
}
