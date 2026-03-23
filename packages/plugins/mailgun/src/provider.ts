import type {
  EmailProvider,
  EmailSendInput,
  EmailSendResult,
  EmailProviderSettingDef,
} from '@forkcart/core';

/**
 * Mailgun Email Provider — sends emails via the Mailgun HTTP API.
 * No SDK dependency — uses native fetch with Basic auth.
 */
export class MailgunEmailProvider implements EmailProvider {
  readonly id = 'mailgun';
  readonly displayName = 'Mailgun';

  private apiKey = '';
  private domain = '';
  private fromAddress = '';
  private region: 'US' | 'EU' = 'US';

  async initialize(settings: Record<string, unknown>): Promise<void> {
    this.apiKey = (settings['apiKey'] as string) ?? '';
    this.domain = (settings['domain'] as string) ?? '';
    this.fromAddress = (settings['fromAddress'] as string) ?? '';
    this.region = ((settings['region'] as string) ?? 'US') === 'EU' ? 'EU' : 'US';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.domain && this.fromAddress);
  }

  getRequiredSettings(): EmailProviderSettingDef[] {
    return [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Mailgun API key',
      },
      {
        key: 'domain',
        label: 'Domain',
        type: 'text',
        required: true,
        placeholder: 'mg.yourdomain.com',
        description: 'Mailgun sending domain',
      },
      {
        key: 'fromAddress',
        label: 'From Address',
        type: 'text',
        required: true,
        placeholder: 'shop@yourdomain.com',
        description: 'Default sender email address',
      },
      {
        key: 'region',
        label: 'Region',
        type: 'text',
        required: false,
        placeholder: 'US',
        description: 'Mailgun API region (US or EU)',
      },
    ];
  }

  async sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      throw new Error('Mailgun provider is not configured');
    }

    const baseUrl =
      this.region === 'EU' ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3';
    const url = `${baseUrl}/${this.domain}/messages`;

    const formData = new URLSearchParams();
    formData.append('from', this.fromAddress);
    formData.append('to', input.to);
    formData.append('subject', input.subject);
    formData.append('html', input.html);
    if (input.text) {
      formData.append('text', input.text);
    }
    if (input.replyTo) {
      formData.append('h:Reply-To', input.replyTo);
    }

    const credentials = Buffer.from(`api:${this.apiKey}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mailgun API error (${response.status}): ${errorBody}`);
    }

    const result = (await response.json()) as { id: string; message: string };

    return {
      messageId: result.id,
      accepted: true,
    };
  }
}
