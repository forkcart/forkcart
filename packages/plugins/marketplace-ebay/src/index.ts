import type { PluginDefinition } from '@forkcart/core';
import { EbayMarketplaceProvider } from './provider';

/** eBay marketplace plugin definition for the PluginLoader */
export const ebayMarketplacePlugin: PluginDefinition = {
  name: 'marketplace-ebay',
  version: '0.1.0',
  description: 'Sell on eBay — sync products, import orders, and manage inventory via REST API.',
  author: 'ForkCart',
  type: 'marketplace',
  createMarketplaceProvider: () => new EbayMarketplaceProvider(),
  defaultSettings: {
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    siteId: 'EBAY_DE',
    sandbox: false,
  },
};

export { EbayMarketplaceProvider } from './provider';
