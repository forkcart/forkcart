import type { PluginDefinition } from '@forkcart/core';
import { MailgunEmailProvider } from './provider';

/** Mailgun plugin definition for the PluginLoader */
export const mailgunPlugin: PluginDefinition = {
  name: 'mailgun',
  version: '0.1.0',
  description:
    'Send transactional emails via Mailgun — order confirmations, shipping notifications, welcome emails, and more.',
  author: 'ForkCart',
  type: 'notification',
  defaultSettings: {
    apiKey: '',
    domain: '',
    fromAddress: '',
  },
};

/** Create a new MailgunEmailProvider instance */
export function createMailgunProvider(): MailgunEmailProvider {
  return new MailgunEmailProvider();
}

export { MailgunEmailProvider } from './provider';
