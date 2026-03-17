/**
 * StorefrontSlot - Renders plugin content in designated storefront slots.
 *
 * This is a server component that fetches slot content from the API
 * and renders HTML safely with sanitization.
 */

import DOMPurify from 'isomorphic-dompurify';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

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
 * Sanitize HTML content to prevent XSS attacks
 */
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a',
      'abbr',
      'address',
      'article',
      'aside',
      'b',
      'blockquote',
      'br',
      'button',
      'caption',
      'cite',
      'code',
      'col',
      'colgroup',
      'data',
      'dd',
      'del',
      'details',
      'dfn',
      'div',
      'dl',
      'dt',
      'em',
      'figcaption',
      'figure',
      'footer',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'header',
      'hr',
      'i',
      'img',
      'ins',
      'kbd',
      'li',
      'main',
      'mark',
      'nav',
      'ol',
      'p',
      'picture',
      'pre',
      'q',
      's',
      'samp',
      'section',
      'small',
      'source',
      'span',
      'strong',
      'sub',
      'summary',
      'sup',
      'table',
      'tbody',
      'td',
      'tfoot',
      'th',
      'thead',
      'time',
      'tr',
      'u',
      'ul',
      'var',
      'video',
      'wbr',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'srcset',
      'alt',
      'title',
      'class',
      'id',
      'style',
      'target',
      'rel',
      'width',
      'height',
      'loading',
      'decoding',
      'data-*',
      'aria-*',
      'role',
      'type',
      'name',
      'value',
      'placeholder',
      'disabled',
      'readonly',
      'checked',
      'colspan',
      'rowspan',
      'scope',
      'headers',
      'datetime',
      'open',
      'controls',
      'autoplay',
      'loop',
      'muted',
      'poster',
      'preload',
      'sizes',
      'media',
    ],
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['target'],
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'textarea',
      'select',
    ],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
  });
}

/**
 * StorefrontSlot - Server Component that renders plugin slot content
 */
export async function StorefrontSlot({ slotName, currentPage, className }: StorefrontSlotProps) {
  const contents = await fetchSlotContent(slotName, currentPage);

  if (contents.length === 0) return null;

  return (
    <div className={className} data-slot={slotName} data-plugin-slot>
      {contents.map((item, index) => (
        <div
          key={`${item.pluginName}-${index}`}
          data-plugin={item.pluginName}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
        />
      ))}
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
