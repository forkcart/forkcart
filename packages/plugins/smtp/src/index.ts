import type { PluginDefinition } from '@forkcart/core';
import { SmtpEmailProvider } from './provider';

/** SMTP plugin definition for the PluginLoader */
export const smtpPlugin: PluginDefinition = {
  name: 'smtp',
  version: '0.1.0',
  description:
    'Send transactional emails via any SMTP server — works with Gmail, Outlook, Postfix, and any standard SMTP service.',
  author: 'ForkCart',
  type: 'notification',
  defaultSettings: {
    host: '',
    port: '587',
    user: '',
    pass: '',
    fromAddress: '',
  },
};

/** Create a new SmtpEmailProvider instance */
export function createSmtpProvider(): SmtpEmailProvider {
  return new SmtpEmailProvider();
}

export { SmtpEmailProvider } from './provider';
