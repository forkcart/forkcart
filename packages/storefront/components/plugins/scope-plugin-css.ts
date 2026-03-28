/**
 * scopePluginCss — Automatically prefixes CSS selectors with a
 * `[data-plugin="<name>"]` attribute selector so that plugin styles
 * cannot leak into the core storefront or other plugins.
 *
 * Rules:
 * - Regular selectors are prefixed: `.foo {}` → `[data-plugin="x"] .foo {}`
 * - `@media` / `@supports` / `@layer` — preserved, selectors inside are prefixed
 * - `@keyframes` / `@font-face` — left untouched (global by nature)
 * - `:root` / `html` / `body` selectors are rewritten to scope selector
 */

export function scopePluginCss(css: string, pluginName: string): string {
  if (!css || !pluginName) return css;

  const scope = `[data-plugin="${pluginName}"]`;
  return processBlock(css, scope);
}

function charAt(s: string, i: number): string {
  return s.charAt(i);
}

function processBlock(css: string, scope: string): string {
  let result = '';
  let i = 0;

  while (i < css.length) {
    const ch = charAt(css, i);

    // Skip whitespace
    if (/\s/.test(ch)) {
      result += ch;
      i++;
      continue;
    }

    // Skip comments
    if (ch === '/' && charAt(css, i + 1) === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) {
        result += css.slice(i);
        break;
      }
      result += css.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    // At-rules
    if (ch === '@') {
      const atRule = readAtRuleNameAndPrelude(css, i);

      // @keyframes and @font-face: pass through untouched
      if (/^@(keyframes|font-face)\b/.test(atRule.text)) {
        if (atRule.hasBlock) {
          const block = readBracedBlock(css, atRule.blockStart);
          result += css.slice(i, block.end + 1);
          i = block.end + 1;
        } else {
          result += atRule.text;
          i = atRule.end;
        }
        continue;
      }

      // @media, @supports, @layer — recurse into block
      if (atRule.hasBlock) {
        const block = readBracedBlock(css, atRule.blockStart);
        const inner = css.slice(block.start + 1, block.end);
        const scopedInner = processBlock(inner, scope);
        result += css.slice(i, block.start + 1) + scopedInner + '}';
        i = block.end + 1;
        continue;
      }

      // Other at-rules without blocks (e.g., @import, @charset)
      const semi = css.indexOf(';', i);
      if (semi === -1) {
        result += css.slice(i);
        break;
      }
      result += css.slice(i, semi + 1);
      i = semi + 1;
      continue;
    }

    // Regular rule: selector { declarations }
    const openBrace = findTopLevelChar(css, '{', i);
    if (openBrace === -1) {
      // Trailing content without a block — pass through
      result += css.slice(i);
      break;
    }

    const selectorText = css.slice(i, openBrace).trim();
    const block = readBracedBlock(css, openBrace);
    const body = css.slice(block.start + 1, block.end);

    // Scope each selector in the comma-separated list
    const scopedSelector = selectorText
      .split(',')
      .map((s) => scopeSelector(s.trim(), scope))
      .join(', ');

    result += `${scopedSelector} {${body}}`;
    i = block.end + 1;
  }

  return result;
}

/**
 * Prefix a single selector with the scope attribute selector.
 * `:root`, `html`, and `body` are replaced with the scope itself.
 */
function scopeSelector(selector: string, scope: string): string {
  if (!selector) return selector;

  // Replace :root / html / body with the scope
  if (/^(:root|html|body)$/i.test(selector)) {
    return scope;
  }
  if (/^(:root|html|body)\s/i.test(selector)) {
    return scope + ' ' + selector.replace(/^(:root|html|body)\s+/i, '');
  }

  return `${scope} ${selector}`;
}

// ─── Parsing helpers ────────────────────────────────────────────────────────

interface AtRuleInfo {
  text: string;
  end: number;
  hasBlock: boolean;
  blockStart: number;
}

function readAtRuleNameAndPrelude(css: string, start: number): AtRuleInfo {
  let i = start;
  let depth = 0;

  while (i < css.length) {
    const c = charAt(css, i);
    if (c === '{') {
      return { text: css.slice(start, i).trim(), end: i, hasBlock: true, blockStart: i };
    }
    if (c === ';' && depth === 0) {
      return { text: css.slice(start, i + 1), end: i + 1, hasBlock: false, blockStart: -1 };
    }
    if (c === '(') depth++;
    if (c === ')') depth--;
    i++;
  }

  return { text: css.slice(start), end: css.length, hasBlock: false, blockStart: -1 };
}

function readBracedBlock(css: string, openBrace: number): { start: number; end: number } {
  let depth = 1;
  let i = openBrace + 1;

  while (i < css.length && depth > 0) {
    const c = charAt(css, i);
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (depth > 0) i++;
  }

  return { start: openBrace, end: i };
}

function findTopLevelChar(css: string, char: string, start: number): number {
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    const c = charAt(css, i);
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === char && depth === 0) return i;
  }
  return -1;
}
