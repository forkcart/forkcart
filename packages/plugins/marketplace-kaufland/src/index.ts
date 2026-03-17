import { definePlugin } from '@forkcart/plugin-sdk';
import { KauflandMarketplaceProvider } from './provider';

const provider = new KauflandMarketplaceProvider();

const kauflandPluginDef = definePlugin({
  name: 'marketplace-kaufland',
  version: '0.1.0',
  type: 'marketplace',
  description:
    'Sell on Kaufland — sync products, import orders, and manage inventory via Kaufland Seller API.',
  author: 'ForkCart',

  settings: {
    clientKey: {
      type: 'string',
      label: 'Client Key',
      required: true,
      description: 'Kaufland Seller API client key',
    },
    secretKey: {
      type: 'string',
      label: 'Secret Key',
      secret: true,
      required: true,
      description: 'Kaufland Seller API secret key',
    },
    storefront: {
      type: 'select',
      label: 'Storefront',
      options: ['DE', 'SK', 'CZ', 'PL', 'AT'],
      default: 'DE',
      description: 'Kaufland storefront country',
    },
  },

  async onActivate(ctx) {
    await provider.connect(ctx.settings as unknown as Record<string, unknown>);
    ctx.logger.info('Kaufland marketplace provider activated');
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

export default kauflandPluginDef;

/** @deprecated Use default export instead */
export const kauflandMarketplacePlugin = kauflandPluginDef;

export { KauflandMarketplaceProvider } from './provider';
