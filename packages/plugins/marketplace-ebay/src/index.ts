import { definePlugin } from '@forkcart/plugin-sdk';
import { EbayMarketplaceProvider } from './provider';

const provider = new EbayMarketplaceProvider();

const ebayPluginDef = definePlugin({
  name: 'marketplace-ebay',
  version: '0.1.0',
  type: 'marketplace',
  description: 'Sell on eBay — sync products, import orders, and manage inventory via REST API.',
  author: 'ForkCart',

  settings: {
    clientId: {
      type: 'string',
      label: 'Client ID',
      required: true,
      description: 'eBay application client ID (App ID)',
    },
    clientSecret: {
      type: 'string',
      label: 'Client Secret',
      secret: true,
      required: true,
      description: 'eBay application client secret (Cert ID)',
    },
    refreshToken: {
      type: 'string',
      label: 'Refresh Token',
      secret: true,
      required: true,
      description: 'OAuth2 refresh token from eBay Developer Portal',
    },
    siteId: {
      type: 'select',
      label: 'Site',
      options: [
        'EBAY_DE',
        'EBAY_US',
        'EBAY_GB',
        'EBAY_FR',
        'EBAY_IT',
        'EBAY_ES',
        'EBAY_NL',
        'EBAY_AT',
      ],
      default: 'EBAY_DE',
      description: 'eBay marketplace site',
    },
    sandbox: {
      type: 'boolean',
      label: 'Sandbox Mode',
      default: false,
      description: 'Use eBay sandbox environment for testing',
    },
  },

  async onActivate(ctx) {
    await provider.connect(ctx.settings as unknown as Record<string, unknown>);
    ctx.logger.info('eBay marketplace provider activated');
  },

  async onDeactivate() {
    await provider.disconnect();
  },

  provider: {
    connect: (settings: Record<string, unknown>) => provider.connect(settings),
    disconnect: () => provider.disconnect(),
    testConnection: () => provider.testConnection(),
    listProduct: (input) =>
      provider.listProduct(input as Parameters<typeof provider.listProduct>[0]),
    updateListing: (id: string, input) =>
      provider.updateListing(id, input as Parameters<typeof provider.updateListing>[1]),
    deleteListing: (id: string) => provider.deleteListing(id),
    fetchOrders: (since?: Date) => provider.fetchOrders(since) as never,
    acknowledgeOrder: (id: string) => provider.acknowledgeOrder(id),
    updateShipment: (id: string, tracking) =>
      provider.updateShipment(id, tracking as Parameters<typeof provider.updateShipment>[1]),
    updateInventory: (sku: string, qty: number) => provider.updateInventory(sku, qty),
    bulkUpdateInventory: (items) =>
      provider.bulkUpdateInventory(items as Parameters<typeof provider.bulkUpdateInventory>[0]),
    getMarketplaceCategories: () => provider.getMarketplaceCategories(),
  },
});

export default ebayPluginDef;

/** @deprecated Use default export instead */
export const ebayMarketplacePlugin = ebayPluginDef;

export { EbayMarketplaceProvider } from './provider';
