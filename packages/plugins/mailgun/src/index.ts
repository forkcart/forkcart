import { definePlugin } from '@forkcart/plugin-sdk';
import { MailgunEmailProvider } from './provider';

const provider = new MailgunEmailProvider();

const mailgunPluginDef = definePlugin({
  name: 'mailgun',
  version: '0.1.0',
  type: 'email',
  description:
    'Send transactional emails via Mailgun — order confirmations, shipping notifications, welcome emails, and more.',
  author: 'ForkCart',
  permissions: ['email:send', 'settings:read'],

  settings: {
    apiKey: {
      type: 'string',
      label: 'API Key',
      secret: true,
      required: true,
      placeholder: 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      description: 'Your Mailgun API key',
    },
    domain: {
      type: 'string',
      label: 'Domain',
      required: true,
      placeholder: 'mg.yourdomain.com',
      description: 'Mailgun sending domain',
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
    region: {
      type: 'select',
      label: 'Region',
      options: ['US', 'EU'],
      default: 'US',
      description: 'Mailgun API region',
    },
  },

  async onActivate(ctx) {
    await provider.initialize(ctx.settings as unknown as Record<string, unknown>);
    ctx.logger.info('Mailgun email provider activated');
  },

  provider: {
    initialize: (settings: Record<string, unknown>) => provider.initialize(settings),
    isConfigured: () => provider.isConfigured(),
    sendEmail: (input) => provider.sendEmail(input as Parameters<typeof provider.sendEmail>[0]),
  },
});

export default mailgunPluginDef;

/** @deprecated Use default export instead */
export const mailgunPlugin = mailgunPluginDef;

/** @deprecated Use default export instead */
export function createMailgunProvider(): MailgunEmailProvider {
  return new MailgunEmailProvider();
}

export { MailgunEmailProvider } from './provider';
