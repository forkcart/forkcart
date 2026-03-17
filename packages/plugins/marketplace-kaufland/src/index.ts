import type { PluginDefinition } from '@forkcart/core';
import { KauflandMarketplaceProvider } from './provider';

/** Kaufland Global Marketplace plugin definition for the PluginLoader */
export const kauflandMarketplacePlugin: PluginDefinition = {
  name: 'marketplace-kaufland',
  version: '0.1.0',
  description:
    'Sell on Kaufland — sync products, import orders, and manage inventory via Kaufland Seller API.',
  author: 'ForkCart',
  type: 'marketplace',
  createMarketplaceProvider: () => new KauflandMarketplaceProvider(),
  defaultSettings: {
    clientKey: '',
    secretKey: '',
    storefront: 'DE',
  },
};

export { KauflandMarketplaceProvider } from './provider';
