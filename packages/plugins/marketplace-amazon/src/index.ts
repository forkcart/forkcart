import type { PluginDefinition } from '@forkcart/core';
import { AmazonMarketplaceProvider } from './provider';

/** Amazon marketplace plugin definition for the PluginLoader */
export const amazonMarketplacePlugin: PluginDefinition = {
  name: 'marketplace-amazon',
  version: '0.1.0',
  description: 'Sell on Amazon — sync products, import orders, and manage inventory via SP-API.',
  author: 'ForkCart',
  type: 'marketplace',
  createMarketplaceProvider: () => new AmazonMarketplaceProvider(),
  defaultSettings: {
    sellerId: '',
    marketplaceId: 'A1PA6795UKMFR9', // Amazon.de
    refreshToken: '',
    clientId: '',
    clientSecret: '',
    region: 'EU',
  },
};

export { AmazonMarketplaceProvider } from './provider';
