/**
 * HTML sanitization utility for preventing XSS attacks.
 * RVS-010: Sanitize AI-generated content before rendering in admin panel.
 */
import sanitizeHtmlLib from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'li',
    'ol',
    'p',
    'pre',
    'span',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
  ],
  allowedAttributes: {
    '*': ['class', 'id', 'style'],
    a: ['href', 'target', 'rel', 'title'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  disallowedTagsMode: 'discard',
};

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Use this for AI-generated or untrusted HTML content before rendering.
 */
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, SANITIZE_OPTIONS);
}
