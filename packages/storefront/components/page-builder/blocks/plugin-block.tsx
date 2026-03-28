/**
 * PluginBlockRenderer — Renders a plugin's PageBuilder block.
 *
 * When an admin places a PluginBlock in the PageBuilder, the Craft.js JSON
 * stores the pluginName + blockName. At render time we fetch the block content
 * from the plugin blocks API and render it with the same sanitisation as
 * StorefrontSlot.
 */

import { API_URL } from '@/lib/config';
import { sanitizePluginHtml } from '@/components/plugins/sanitize-plugin-html';

interface PluginBlockProps {
  pluginName: string;
  blockName: string;
}

interface BlockData {
  pluginName: string;
  name: string;
  content: string;
}

interface BlocksResponse {
  data: BlockData[];
}

/** In-memory cache to avoid hammering the API on every render */
let blockCache: { data: BlockData[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all plugin blocks and find the matching one.
 * Uses in-memory cache + Next.js fetch cache to prevent request storms.
 */
async function fetchBlockContent(pluginName: string, blockName: string): Promise<string | null> {
  // Return from memory cache if fresh
  if (blockCache && Date.now() - blockCache.fetchedAt < CACHE_TTL) {
    const block = blockCache.data.find((b) => b.pluginName === pluginName && b.name === blockName);
    return block?.content ?? null;
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/public/plugins/blocks`, {
      next: { revalidate: 300 }, // Cache for 5 min in Next.js
    });

    if (!res.ok) {
      // Don't retry on rate limit or server errors
      console.warn(`[plugin-block] Failed to fetch blocks: ${res.status}`);
      return null;
    }

    const json = (await res.json()) as BlocksResponse;
    blockCache = { data: json.data ?? [], fetchedAt: Date.now() };
    const block = blockCache.data.find((b) => b.pluginName === pluginName && b.name === blockName);
    return block?.content ?? null;
  } catch {
    return null;
  }
}

export async function PluginBlockRenderer({ pluginName, blockName }: PluginBlockProps) {
  const content = await fetchBlockContent(pluginName, blockName);

  if (!content) return null;

  // Extract inline scripts (dangerouslySetInnerHTML doesn't execute <script>)
  const scriptMatches = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const inlineScripts = scriptMatches
    .map((s) => {
      const match = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      return match?.[1]?.trim() ?? '';
    })
    .filter((s) => s.length > 0);

  const htmlWithoutScripts = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  return (
    <div data-plugin-block={`${pluginName}:${blockName}`} data-plugin={pluginName}>
      <div dangerouslySetInnerHTML={{ __html: sanitizePluginHtml(htmlWithoutScripts) }} />
      {inlineScripts.map((scriptContent, i) => (
        <script
          key={`${pluginName}-${blockName}-script-${i}`}
          dangerouslySetInnerHTML={{ __html: scriptContent }}
        />
      ))}
    </div>
  );
}
