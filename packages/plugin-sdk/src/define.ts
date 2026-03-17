import type { PluginDefinition, PluginSettingsMap } from './types.js';

/**
 * Define a ForkCart plugin.
 *
 * This is the main entry point for plugin authors. It validates the shape at
 * the type level and returns the definition as-is at runtime.
 *
 * @example
 * ```ts
 * import { definePlugin } from '@forkcart/plugin-sdk'
 *
 * export default definePlugin({
 *   name: 'my-payment-plugin',
 *   version: '1.0.0',
 *   type: 'payment',
 *   description: 'Accept payments via MyGateway',
 *   author: 'Acme Corp',
 *   settings: {
 *     apiKey: { type: 'string', required: true, secret: true, label: 'API Key' },
 *   },
 *   provider: {
 *     async createPaymentIntent(input) { ... },
 *   },
 * })
 * ```
 */
export function definePlugin<TSettings extends PluginSettingsMap = PluginSettingsMap>(
  definition: PluginDefinition<TSettings>,
): PluginDefinition<TSettings> {
  return definition;
}
