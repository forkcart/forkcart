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

import { API_URL } from '@/lib/config';
import { sanitizePluginHtml } from './sanitize-plugin-html';
import { scopePluginCss } from './scope-plugin-css';
import { ScriptExecutor } from './script-executor';

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
      { next: { revalidate: 300 } },
    );

    if (!res.ok) return [];

    const json = (await res.json()) as FallbackResponse;
    return json.data ?? [];
  } catch {
    return [];
  }
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

        // Extract and scope inline <style> tags so plugin CSS can't leak
        const styleMatches = block.content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
        const scopedStyles = styleMatches
          .map((s) => {
            const match = s.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
            return match?.[1]?.trim() ?? '';
          })
          .filter((s) => s.length > 0)
          .map((s) => scopePluginCss(s, block.pluginName))
          .join('\n');

        const htmlClean = block.content
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        return (
          <div
            key={`${block.pluginName}:${block.name}`}
            data-plugin-block={`${block.pluginName}:${block.name}`}
            data-plugin={block.pluginName}
            data-fallback
          >
            {/* Inject scoped styles */}
            {scopedStyles && <style dangerouslySetInnerHTML={{ __html: scopedStyles }} />}
            <div dangerouslySetInnerHTML={{ __html: sanitizePluginHtml(htmlClean) }} />
            {/* Use ScriptExecutor instead of <script> tags — inline scripts inside
                React Suspense hidden boundaries are NOT executed by the browser */}
            {inlineScripts.map((scriptContent, i) => (
              <ScriptExecutor
                key={`${block.pluginName}-${block.name}-fallback-script-${i}`}
                content={scriptContent}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default PluginBlockFallback;
