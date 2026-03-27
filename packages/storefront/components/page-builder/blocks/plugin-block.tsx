/**
 * PluginBlockRenderer — Renders a plugin's PageBuilder block.
 *
 * When an admin places a PluginBlock in the PageBuilder, the Craft.js JSON
 * stores the pluginName + blockName. At render time we fetch the block content
 * from the plugin blocks API and render it with the same sanitisation as
 * StorefrontSlot.
 */

import sanitizeHtmlLib from 'sanitize-html';
import { API_URL } from '@/lib/config';

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

/**
 * Fetch all plugin blocks and find the matching one.
 * Cached for 60s via Next.js fetch cache.
 */
async function fetchBlockContent(pluginName: string, blockName: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/plugins/blocks`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as BlocksResponse;
    const block = json.data.find((b) => b.pluginName === pluginName && b.name === blockName);
    return block?.content ?? null;
  } catch {
    return null;
  }
}

/**
 * Sanitize HTML — same rules as StorefrontSlot (plugins need script/style).
 * Kept as a thin wrapper; the full allowlist lives in StorefrontSlot.
 */
function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: false as unknown as string[], // allow all tags (same trust model as StorefrontSlot)
    allowedAttributes: false, // allow all attributes
    allowVulnerableTags: true, // permit script/style
  });
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
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlWithoutScripts) }} />
      {inlineScripts.map((scriptContent, i) => (
        <script
          key={`${pluginName}-${blockName}-script-${i}`}
          dangerouslySetInnerHTML={{ __html: scriptContent }}
        />
      ))}
    </div>
  );
}
