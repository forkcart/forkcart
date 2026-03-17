import type { PluginDefinition } from '@forkcart/core';
import { OttoMarketplaceProvider } from './provider';

/** Otto Market plugin definition for the PluginLoader */
export const ottoMarketplacePlugin: PluginDefinition = {
  name: 'marketplace-otto',
  version: '0.1.0',
  description:
    'Sell on Otto Market — sync products, import orders, and manage inventory via Otto Market API.',
  author: 'ForkCart',
  type: 'marketplace',
  createMarketplaceProvider: () => new OttoMarketplaceProvider(),
  defaultSettings: {
    clientId: '',
    clientSecret: '',
  },
};

export { OttoMarketplaceProvider } from './provider';
