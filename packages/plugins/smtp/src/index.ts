import { definePlugin } from '@forkcart/plugin-sdk';
import { SmtpEmailProvider } from './provider';

const provider = new SmtpEmailProvider();

const smtpPluginDef = definePlugin({
  name: 'smtp',
  version: '0.1.0',
  type: 'email',
  description:
    'Send transactional emails via any SMTP server — works with Gmail, Outlook, Postfix, and any standard SMTP service.',
  author: 'ForkCart',
  permissions: ['email:send', 'settings:read'],

  settings: {
    host: {
      type: 'string',
      label: 'SMTP Host',
      required: true,
      placeholder: 'smtp.example.com',
      description: 'SMTP server hostname',
    },
    port: {
      type: 'number',
      label: 'SMTP Port',
      required: true,
      default: 587,
      description: 'SMTP port (587 for STARTTLS, 465 for SSL)',
    },
    secure: {
      type: 'boolean',
      label: 'Use SSL/TLS',
      default: false,
      description: 'Use implicit TLS (port 465). Leave off for STARTTLS (port 587).',
    },
    user: {
      type: 'string',
      label: 'Username',
      required: true,
      placeholder: 'your@email.com',
      description: 'SMTP authentication username',
    },
    pass: {
      type: 'string',
      label: 'Password',
      secret: true,
      required: true,
      placeholder: '••••••••',
      description: 'SMTP authentication password',
    },
    fromAddress: {
      type: 'string',
      label: 'From Address',
      required: true,
      placeholder: 'shop@yourdomain.com',
      description: 'Default sender email address',
    },
    fromName: {
      type: 'string',
      label: 'From Name',
      placeholder: 'My Shop',
      description: 'Default sender display name',
    },
  },

  async onActivate(ctx) {
    await provider.initialize(ctx.settings as unknown as Record<string, unknown>);
    ctx.logger.info('SMTP email provider activated');
  },

  provider: {
    initialize: (settings: Record<string, unknown>) => provider.initialize(settings),
    isConfigured: () => provider.isConfigured(),
    sendEmail: (input) => provider.sendEmail(input as Parameters<typeof provider.sendEmail>[0]),
  },
});

export default smtpPluginDef;

/** @deprecated Use default export instead */
export const smtpPlugin = smtpPluginDef;

/** @deprecated Use default export instead */
export function createSmtpProvider(): SmtpEmailProvider {
  return new SmtpEmailProvider();
}

export { SmtpEmailProvider } from './provider';
