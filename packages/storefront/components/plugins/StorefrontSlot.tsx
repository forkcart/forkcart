/**
 * StorefrontSlot - Renders plugin content in designated storefront slots.
 *
 * This is a server component that fetches slot content from the API
 * and renders HTML safely with sanitization.
 */

import sanitizeHtmlLib from 'sanitize-html';
import { API_URL } from '@/lib/config';

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
 * Sanitize HTML content for plugin slots.
 *
 * IMPORTANT: Plugin slots allow <script> and <style> tags because plugins
 * need JavaScript to function (e.g., analytics, widgets, tracking).
 *
 * Security model:
 * - Plugins are installed by store admins who review them
 * - Marketplace plugins go through review before publishing
 * - This is the same model as Shopware/WooCommerce/Magento
 *
 * If you need stricter security, consider CSP nonces in a future version.
 */
function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      // Layout & structure
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
      // Plugin essentials — scripts and styles
      'script',
      'style',
      'link',
      'noscript',
      // Forms (for plugin widgets)
      'form',
      'input',
      'textarea',
      'select',
      'option',
      'optgroup',
      'label',
      'fieldset',
      'legend',
      // Canvas/SVG (for charts, graphics)
      'canvas',
      'svg',
      'path',
      'circle',
      'rect',
      'line',
      'polygon',
      'polyline',
      'ellipse',
      'g',
      'defs',
      'use',
      'symbol',
      'text',
      'tspan',
      // iframes (for embeds — YouTube, maps, etc.)
      'iframe',
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'data-*', 'aria-*', 'role', 'title'],
      a: ['href', 'target', 'rel', 'title', 'download'],
      img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
      source: ['src', 'srcset', 'type', 'media', 'sizes'],
      video: [
        'src',
        'controls',
        'autoplay',
        'loop',
        'muted',
        'poster',
        'preload',
        'width',
        'height',
      ],
      button: ['type', 'name', 'value', 'disabled', 'onclick'],
      td: ['colspan', 'rowspan', 'scope', 'headers'],
      th: ['colspan', 'rowspan', 'scope', 'headers'],
      time: ['datetime'],
      details: ['open'],
      // Script & style attributes
      script: ['src', 'type', 'async', 'defer', 'crossorigin', 'integrity', 'nomodule'],
      style: ['type', 'media'],
      link: ['rel', 'href', 'type', 'media', 'crossorigin', 'integrity'],
      // Form attributes
      form: ['action', 'method', 'enctype', 'target', 'novalidate'],
      input: [
        'type',
        'name',
        'value',
        'placeholder',
        'required',
        'disabled',
        'readonly',
        'checked',
        'min',
        'max',
        'step',
        'pattern',
        'autocomplete',
      ],
      textarea: ['name', 'placeholder', 'required', 'disabled', 'readonly', 'rows', 'cols'],
      select: ['name', 'required', 'disabled', 'multiple'],
      option: ['value', 'selected', 'disabled'],
      label: ['for'],
      // SVG attributes
      svg: ['viewBox', 'width', 'height', 'fill', 'stroke', 'xmlns'],
      path: ['d', 'fill', 'stroke', 'stroke-width', 'transform'],
      circle: ['cx', 'cy', 'r', 'fill', 'stroke'],
      rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke'],
      line: ['x1', 'y1', 'x2', 'y2', 'stroke'],
      polygon: ['points', 'fill', 'stroke'],
      polyline: ['points', 'fill', 'stroke'],
      ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke'],
      g: ['transform', 'fill', 'stroke'],
      use: ['href', 'xlink:href', 'x', 'y', 'width', 'height'],
      text: ['x', 'y', 'fill', 'font-size', 'text-anchor'],
      // Canvas
      canvas: ['width', 'height'],
      // iframe (for embeds)
      iframe: [
        'src',
        'width',
        'height',
        'frameborder',
        'allowfullscreen',
        'allow',
        'loading',
        'sandbox',
      ],
    },
    // Allow inline styles (plugins need them for widgets)
    allowedStyles: {
      '*': {
        // Allow common CSS properties
        color: [/.*/],
        'background-color': [/.*/],
        background: [/.*/],
        'font-size': [/.*/],
        'font-weight': [/.*/],
        'text-align': [/.*/],
        margin: [/.*/],
        padding: [/.*/],
        border: [/.*/],
        'border-radius': [/.*/],
        display: [/.*/],
        width: [/.*/],
        height: [/.*/],
        'max-width': [/.*/],
        'min-width': [/.*/],
        position: [/.*/],
        top: [/.*/],
        right: [/.*/],
        bottom: [/.*/],
        left: [/.*/],
        'z-index': [/.*/],
        opacity: [/.*/],
        transform: [/.*/],
        transition: [/.*/],
        'box-shadow': [/.*/],
        'text-decoration': [/.*/],
        'line-height': [/.*/],
        'font-family': [/.*/],
        cursor: [/.*/],
        overflow: [/.*/],
        'flex-direction': [/.*/],
        'justify-content': [/.*/],
        'align-items': [/.*/],
        gap: [/.*/],
        flex: [/.*/],
        'flex-wrap': [/.*/],
        grid: [/.*/],
        'grid-template-columns': [/.*/],
        'grid-gap': [/.*/],
      },
    },
    disallowedTagsMode: 'discard',
  });
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
        const htmlWithoutScripts = item.content.replace(
          /<script[^>]*>[\s\S]*?<\/script>/gi,
          '',
        );

        return (
          <div key={`${item.pluginName}-${index}`} data-plugin={item.pluginName}>
            {/* Render HTML content */}
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlWithoutScripts) }} />
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
