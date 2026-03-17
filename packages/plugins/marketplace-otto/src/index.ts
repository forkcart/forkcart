import { definePlugin } from '@forkcart/plugin-sdk';
import { OttoMarketplaceProvider } from './provider';

const provider = new OttoMarketplaceProvider();

const ottoPluginDef = definePlugin({
  name: 'marketplace-otto',
  version: '0.1.0',
  type: 'marketplace',
  description:
    'Sell on Otto Market — sync products, import orders, and manage inventory via Otto Market API.',
  author: 'ForkCart',

  settings: {
    clientId: {
      type: 'string',
      label: 'Client ID',
      required: true,
      description: 'Otto Market API client ID',
    },
    clientSecret: {
      type: 'string',
      label: 'Client Secret',
      secret: true,
      required: true,
      description: 'Otto Market API client secret',
    },
  },

  async onActivate(ctx) {
    await provider.connect(ctx.settings as unknown as Record<string, unknown>);
    ctx.logger.info('Otto Market provider activated');
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

export default ottoPluginDef;

/** @deprecated Use default export instead */
export const ottoMarketplacePlugin = ottoPluginDef;

export { OttoMarketplaceProvider } from './provider';
