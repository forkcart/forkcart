import { createDatabase, type Database } from '@forkcart/database';
import { PluginLoader, PaymentProviderRegistry, EventBus } from '@forkcart/core';

export interface CliContext {
  db: Database;
  pluginLoader: PluginLoader;
  cleanup: () => Promise<void>;
}

/**
 * Initialize CLI context with database and plugin loader
 */
export async function createCliContext(): Promise<CliContext> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is required.\n' +
        'Set it in your .env file or export it before running the CLI.',
    );
  }

  const db = createDatabase(connectionString);

  // Create minimal registries (plugins may need them)
  const paymentRegistry = new PaymentProviderRegistry();
  const eventBus = new EventBus();

  const pluginLoader = new PluginLoader(
    db,
    paymentRegistry,
    undefined,
    undefined,
    undefined,
    eventBus,
  );

  // Discover and load plugins from node_modules
  await pluginLoader.discoverPlugins();

  return {
    db,
    pluginLoader,
    cleanup: async () => {
      // Cleanup if needed
    },
  };
}
