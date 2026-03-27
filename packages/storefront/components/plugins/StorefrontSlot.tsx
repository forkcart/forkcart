/**
 * StorefrontSlot - Renders plugin content in designated storefront slots.
 *
 * This is a server component that fetches slot content from the API
 * and renders HTML safely with sanitization.
 */

import { API_URL } from '@/lib/config';
import { sanitizePluginHtml } from './sanitize-plugin-html';

export interface StorefrontSlotProps {
  /** The slot name to render (e.g., 'header-after', 'footer-before') */
  slotName: string;
  /** Optional: current page identifier for page-specific slot filtering */
  currentPage?: string;
  /** Optional: additional CSS classes */
  className?: string;
}

interface SlotContent {
  content: string;
  pluginName: string;
}

interface SlotResponse {
  data: SlotContent[];
}

/**
 * Fetch slot content from the API
 */
async function fetchSlotContent(slotName: string, currentPage?: string): Promise<SlotContent[]> {
  try {
    const params = new URLSearchParams();
    if (currentPage) params.set('page', currentPage);
    const query = params.toString();

    const res = await fetch(
      `${API_URL}/api/v1/public/plugins/slots/${encodeURIComponent(slotName)}${query ? `?${query}` : ''}`,
      { next: { revalidate: 60 } },
    );

    if (!res.ok) return [];

    const json = (await res.json()) as SlotResponse;
    return json.data ?? [];
  } catch {
    // Silently fail — missing slots shouldn't break the page
    return [];
  }
}

/**
 * StorefrontSlot - Server Component that renders plugin slot content
 *
 * Scripts in plugin content need special handling:
 * - dangerouslySetInnerHTML does NOT execute <script> tags
 * - We extract scripts and render them via next/script
 */
export async function StorefrontSlot({ slotName, currentPage, className }: StorefrontSlotProps) {
  const contents = await fetchSlotContent(slotName, currentPage);

  if (contents.length === 0) return null;

  return (
    <div className={className} data-slot={slotName} data-plugin-slot>
      {contents.map((item, index) => {
        // Extract inline scripts from the content
        const scriptMatches = item.content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
        const inlineScripts = scriptMatches
          .map((s) => {
            const match = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
            return match?.[1]?.trim() ?? '';
          })
          .filter((s) => s.length > 0);

        // Remove scripts from HTML content (they'll be executed separately)
        const htmlWithoutScripts = item.content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

        return (
          <div key={`${item.pluginName}-${index}`} data-plugin={item.pluginName}>
            {/* Render HTML content */}
            <div dangerouslySetInnerHTML={{ __html: sanitizePluginHtml(htmlWithoutScripts) }} />
            {/* Render scripts separately so they execute */}
            {inlineScripts.map((scriptContent, i) => (
              <script
                key={`${item.pluginName}-script-${i}`}
                dangerouslySetInnerHTML={{ __html: scriptContent }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Client-side version for dynamic slot rendering
 */
export function StorefrontSlotClient({
  slotName,
  currentPage: _currentPage,
  className,
}: StorefrontSlotProps) {
  'use client';

  // This is a placeholder - actual client implementation would use useEffect/useState
  // For now, we recommend using the server component version
  return <div className={className} data-slot={slotName} data-plugin-slot data-hydrate="true" />;
}

export default StorefrontSlot;
