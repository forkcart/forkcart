/**
 * Extracts placed PluginBlock keys from a Craft.js serialized JSON structure.
 *
 * Scans all nodes for type "PluginBlock" and returns their "pluginName:blockName"
 * identifiers. This is used to determine which plugin blocks are already in the
 * PageBuilder template so the fallback system can skip them.
 */

interface CraftNode {
  type: { resolvedName: string } | string;
  props: Record<string, unknown>;
  [key: string]: unknown;
}

type CraftData = Record<string, CraftNode>;

export function extractPlacedPluginBlocks(content: unknown): string[] {
  if (!content || typeof content !== 'object') return [];

  const data = content as CraftData;
  const placed: string[] = [];

  for (const node of Object.values(data)) {
    const resolvedName =
      typeof node.type === 'string'
        ? node.type
        : node.type && typeof node.type === 'object' && 'resolvedName' in node.type
          ? node.type.resolvedName
          : null;

    if (resolvedName === 'PluginBlock') {
      const pluginName = node.props?.pluginName as string | undefined;
      const blockName = node.props?.blockName as string | undefined;
      if (pluginName && blockName) {
        placed.push(`${pluginName}:${blockName}`);
      }
    }
  }

  return placed;
}
