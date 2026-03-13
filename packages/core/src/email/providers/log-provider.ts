import { createLogger } from '../../lib/logger';
import type {
  EmailProvider,
  EmailSendInput,
  EmailSendResult,
  EmailProviderSettingDef,
} from '../provider';

const logger = createLogger('email-log-provider');

/**
 * Log Email Provider — writes emails to the console instead of sending them.
 * Perfect for local development and testing without a real SMTP server.
 * Always "configured" — no settings required.
 */
export class LogEmailProvider implements EmailProvider {
  readonly id = 'log';
  readonly displayName = 'Console Log (Dev)';

  private fromAddress = 'dev@forkcart.local';

  async initialize(settings: Record<string, unknown>): Promise<void> {
    this.fromAddress = (settings['fromAddress'] as string) || 'dev@forkcart.local';
  }

  isConfigured(): boolean {
    return true;
  }

  getRequiredSettings(): EmailProviderSettingDef[] {
    return [
      {
        key: 'fromAddress',
        label: 'From Address',
        type: 'text',
        required: false,
        placeholder: 'dev@forkcart.local',
        description: 'Sender address shown in logs (optional)',
      },
    ];
  }

  async sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
    const messageId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    logger.info(
      {
        messageId,
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        htmlLength: input.html.length,
        textLength: input.text?.length ?? 0,
      },
      '📧 EMAIL SENT (log provider)',
    );

    // Also log a visible separator to stdout for dev convenience
    const separator = '─'.repeat(60);
    console.log(`\n${separator}`);
    console.log(`📧 EMAIL — ${input.subject}`);
    console.log(`   From: ${this.fromAddress}`);
    console.log(`   To:   ${input.to}`);
    console.log(`   ID:   ${messageId}`);
    if (input.text) {
      console.log(`${separator}`);
      console.log(input.text);
    }
    console.log(`${separator}\n`);

    return {
      messageId,
      accepted: true,
    };
  }
}
