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
import { ScriptExecutor } from '@/components/plugins/script-executor';

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
 * Inflight promise for request deduplication.
 * When multiple PluginBlocks render concurrently and the cache is cold,
 * only one actual fetch fires — all others await the same promise.
 */
let inflightRequest: Promise<BlockData[]> | null = null;

async function fetchAllBlocks(): Promise<BlockData[]> {
  // Return from memory cache if fresh
  if (blockCache && Date.now() - blockCache.fetchedAt < CACHE_TTL) {
    return blockCache.data;
  }

  // Deduplicate: if a request is already in flight, piggyback on it
  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/public/plugins/blocks`, {
        next: { revalidate: 300 }, // Cache for 5 min in Next.js
      });

      if (!res.ok) {
        console.warn(`[plugin-block] Failed to fetch blocks: ${res.status}`);
        return [];
      }

      const json = (await res.json()) as BlocksResponse;
      const data = json.data ?? [];
      blockCache = { data, fetchedAt: Date.now() };
      return data;
    } catch {
      return [];
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

/**
 * Fetch all plugin blocks and find the matching one.
 * Uses in-memory cache + Next.js fetch cache + request deduplication
 * to prevent request storms when many PluginBlocks render concurrently.
 */
async function fetchBlockContent(pluginName: string, blockName: string): Promise<string | null> {
  const blocks = await fetchAllBlocks();
  const block = blocks.find((b) => b.pluginName === pluginName && b.name === blockName);
  return block?.content ?? null;
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
      {/* Use ScriptExecutor instead of <script> tags — inline scripts inside
          React Suspense hidden boundaries are NOT executed by the browser */}
      {inlineScripts.map((scriptContent, i) => (
        <ScriptExecutor key={`${pluginName}-${blockName}-script-${i}`} content={scriptContent} />
      ))}
    </div>
  );
}
