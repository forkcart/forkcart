/**
 * PluginBlockFallback — Renders plugin PageBuilder blocks that the admin
 * hasn't placed in the page template, at their default slot positions.
 *
 * Usage in a page layout:
 *   <PluginBlockFallback currentPage="/product/my-product" placedBlocks={placedBlocks} />
 *
 * `placedBlocks` is an array of "pluginName:blockName" strings extracted from
 * the Craft.js JSON of the current page template.
 */

import sanitizeHtmlLib from 'sanitize-html';
import { API_URL } from '@/lib/config';

export interface PluginBlockFallbackProps {
  /** The slot to render fallbacks for (e.g., 'product-page-bottom') */
  slotName: string;
  /** Current page path for page filtering */
  currentPage?: string;
  /** Block keys already placed in the PageBuilder template ("pluginName:blockName") */
  placedBlocks?: string[];
  /** Additional CSS class */
  className?: string;
}

interface FallbackBlock {
  pluginName: string;
  name: string;
  label: string;
  content: string;
  defaultSlot: string;
  defaultOrder: number;
}

interface FallbackResponse {
  data: FallbackBlock[];
}

async function fetchFallbackBlocks(
  currentPage?: string,
  placedBlocks?: string[],
): Promise<FallbackBlock[]> {
  try {
    const params = new URLSearchParams();
    if (currentPage) params.set('page', currentPage);
    if (placedBlocks && placedBlocks.length > 0) params.set('placed', placedBlocks.join(','));
    const query = params.toString();

    const res = await fetch(
      `${API_URL}/api/v1/public/plugins/blocks/fallbacks${query ? `?${query}` : ''}`,
      { next: { revalidate: 60 } },
    );

    if (!res.ok) return [];

    const json = (await res.json()) as FallbackResponse;
    return json.data ?? [];
  } catch {
    return [];
  }
}

function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: false as unknown as string[],
    allowedAttributes: false,
    allowVulnerableTags: true,
  });
}

/**
 * Renders all fallback blocks for a specific slot.
 * Place this next to (or inside) the corresponding <StorefrontSlot>.
 */
export async function PluginBlockFallback({
  slotName,
  currentPage,
  placedBlocks,
  className,
}: PluginBlockFallbackProps) {
  const allFallbacks = await fetchFallbackBlocks(currentPage, placedBlocks);

  // Filter to only blocks targeting this slot
  const blocks = allFallbacks.filter((b) => b.defaultSlot === slotName);

  if (blocks.length === 0) return null;

  return (
    <div className={className} data-slot={slotName} data-plugin-block-fallback>
      {blocks.map((block) => {
        const scriptMatches = block.content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
        const inlineScripts = scriptMatches
          .map((s) => {
            const match = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
            return match?.[1]?.trim() ?? '';
          })
          .filter((s) => s.length > 0);

        const htmlWithoutScripts = block.content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

        return (
          <div
            key={`${block.pluginName}:${block.name}`}
            data-plugin-block={`${block.pluginName}:${block.name}`}
            data-plugin={block.pluginName}
            data-fallback
          >
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlWithoutScripts) }} />
            {inlineScripts.map((scriptContent, i) => (
              <script
                key={`${block.pluginName}-${block.name}-fallback-script-${i}`}
                dangerouslySetInnerHTML={{ __html: scriptContent }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default PluginBlockFallback;
