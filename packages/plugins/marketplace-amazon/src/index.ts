import { definePlugin } from '@forkcart/plugin-sdk';
import { AmazonMarketplaceProvider } from './provider';

const provider = new AmazonMarketplaceProvider();

const amazonPluginDef = definePlugin({
  name: 'marketplace-amazon',
  version: '0.1.0',
  type: 'marketplace',
  description: 'Sell on Amazon — sync products, import orders, and manage inventory via SP-API.',
  author: 'ForkCart',

  settings: {
    sellerId: {
      type: 'string',
      label: 'Seller ID',
      required: true,
      description: 'Your Amazon Seller ID',
    },
    marketplaceId: {
      type: 'string',
      label: 'Marketplace ID',
      required: true,
      default: 'A1PA6795UKMFR9',
      description: 'Amazon Marketplace ID (default: Amazon.de)',
    },
    refreshToken: {
      type: 'string',
      label: 'Refresh Token',
      secret: true,
      required: true,
      description: 'SP-API refresh token from Seller Central',
    },
    clientId: {
      type: 'string',
      label: 'Client ID',
      required: true,
      description: 'SP-API application client ID',
    },
    clientSecret: {
      type: 'string',
      label: 'Client Secret',
      secret: true,
      required: true,
      description: 'SP-API application client secret',
    },
    region: {
      type: 'select',
      label: 'Region',
      options: ['EU', 'NA', 'FE'],
      default: 'EU',
      description: 'Amazon region (EU, NA, or FE)',
    },
  },

  async onActivate(ctx) {
    await provider.connect(ctx.settings as unknown as Record<string, unknown>);
    ctx.logger.info('Amazon marketplace provider activated');
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

export default amazonPluginDef;

/** @deprecated Use default export instead */
export const amazonMarketplacePlugin = amazonPluginDef;

export { AmazonMarketplaceProvider } from './provider';
