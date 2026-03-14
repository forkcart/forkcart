'use client';

import { useNode } from '@craftjs/core';

export interface BlockStyles {
  // Spacing
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  // Background & Colors
  bgColor?: string;
  textColor?: string;
  // Border
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  // Typography
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  // Dimensions
  minHeight?: number;
  maxWidth?: number;
  // Visibility
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  // Effects
  opacity?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const shadowMap: Record<string, string> = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
};

/** Convert BlockStyles to inline CSS */
export function stylesToCSS(s: BlockStyles = {}): React.CSSProperties {
  const css: React.CSSProperties = {};

  if (s.marginTop) css.marginTop = s.marginTop;
  if (s.marginBottom) css.marginBottom = s.marginBottom;
  if (s.marginLeft) css.marginLeft = s.marginLeft;
  if (s.marginRight) css.marginRight = s.marginRight;
  if (s.paddingTop) css.paddingTop = s.paddingTop;
  if (s.paddingBottom) css.paddingBottom = s.paddingBottom;
  if (s.paddingLeft) css.paddingLeft = s.paddingLeft;
  if (s.paddingRight) css.paddingRight = s.paddingRight;

  if (s.bgColor && s.bgColor !== 'transparent') css.backgroundColor = s.bgColor;
  if (s.textColor) css.color = s.textColor;

  if (s.borderStyle && s.borderStyle !== 'none') {
    css.borderStyle = s.borderStyle;
    css.borderWidth = s.borderWidth ?? 1;
    css.borderColor = s.borderColor ?? '#e5e7eb';
  }
  if (s.borderRadius) css.borderRadius = s.borderRadius;

  if (s.fontSize) css.fontSize = s.fontSize;
  if (s.fontWeight) css.fontWeight = s.fontWeight;
  if (s.textAlign) css.textAlign = s.textAlign;
  if (s.lineHeight) css.lineHeight = s.lineHeight;

  if (s.minHeight) css.minHeight = s.minHeight;
  if (s.maxWidth) css.maxWidth = s.maxWidth;
  if (s.opacity != null && s.opacity < 1) css.opacity = s.opacity;
  if (s.shadow && s.shadow !== 'none') css.boxShadow = shadowMap[s.shadow];

  return css;
}

/** Reusable style settings panel — add to any block's settings */
export function StyleSettings() {
  const {
    actions: { setProp },
    styles,
  } = useNode((node) => ({
    styles: (node.data.props.styles ?? {}) as BlockStyles,
  }));

  const set = (key: keyof BlockStyles, value: unknown) => {
    setProp((p: { styles: BlockStyles }) => {
      if (!p.styles) p.styles = {};
      (p.styles as Record<string, unknown>)[key] = value;
    });
  };

  return (
    <div className="space-y-4">
      {/* Spacing */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500">
          📐 Spacing
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-[10px] font-medium text-gray-400">Margin</p>
          <div className="grid grid-cols-4 gap-1">
            {(['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const).map((k) => (
              <div key={k}>
                <label className="block text-center text-[10px] text-gray-400">
                  {k.replace('margin', '')[0]}
                </label>
                <input
                  type="number"
                  className="w-full rounded border px-1 py-0.5 text-center text-xs"
                  value={styles[k] ?? 0}
                  step={4}
                  onChange={(e) => set(k, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] font-medium text-gray-400">Padding</p>
          <div className="grid grid-cols-4 gap-1">
            {(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const).map((k) => (
              <div key={k}>
                <label className="block text-center text-[10px] text-gray-400">
                  {k.replace('padding', '')[0]}
                </label>
                <input
                  type="number"
                  className="w-full rounded border px-1 py-0.5 text-center text-xs"
                  value={styles[k] ?? 0}
                  step={4}
                  onChange={(e) => set(k, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Colors */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500">
          🎨 Colors
        </summary>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Background</label>
            <input
              type="color"
              className="h-7 w-10 rounded border"
              value={styles.bgColor || '#ffffff'}
              onChange={(e) => set('bgColor', e.target.value)}
            />
            {styles.bgColor && (
              <button
                className="text-[10px] text-red-400 hover:text-red-600"
                onClick={() => set('bgColor', undefined)}
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Text Color</label>
            <input
              type="color"
              className="h-7 w-10 rounded border"
              value={styles.textColor || '#111827'}
              onChange={(e) => set('textColor', e.target.value)}
            />
            {styles.textColor && (
              <button
                className="text-[10px] text-red-400 hover:text-red-600"
                onClick={() => set('textColor', undefined)}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </details>

      {/* Border */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500">
          ▢ Border
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <label className="text-xs text-gray-600">Style</label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              value={styles.borderStyle ?? 'none'}
              onChange={(e) => set('borderStyle', e.target.value)}
            >
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
          {styles.borderStyle && styles.borderStyle !== 'none' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Width</label>
                <input
                  type="number"
                  className="w-16 rounded border px-2 py-1 text-xs"
                  value={styles.borderWidth ?? 1}
                  min={1}
                  max={10}
                  onChange={(e) => set('borderWidth', Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Color</label>
                <input
                  type="color"
                  className="h-7 w-10 rounded border"
                  value={styles.borderColor || '#e5e7eb'}
                  onChange={(e) => set('borderColor', e.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Radius</label>
            <input
              type="number"
              className="w-16 rounded border px-2 py-1 text-xs"
              value={styles.borderRadius ?? 0}
              min={0}
              step={2}
              onChange={(e) => set('borderRadius', Number(e.target.value))}
            />
            <span className="text-[10px] text-gray-400">px</span>
          </div>
        </div>
      </details>

      {/* Typography */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500">
          Aa Typography
        </summary>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Size</label>
            <input
              type="number"
              className="w-16 rounded border px-2 py-1 text-xs"
              value={styles.fontSize ?? ''}
              placeholder="—"
              min={8}
              max={72}
              onChange={(e) => set('fontSize', e.target.value ? Number(e.target.value) : undefined)}
            />
            <span className="text-[10px] text-gray-400">px</span>
          </div>
          <div>
            <label className="text-xs text-gray-600">Weight</label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              value={styles.fontWeight ?? ''}
              onChange={(e) => set('fontWeight', e.target.value || undefined)}
            >
              <option value="">Default</option>
              <option value="normal">Normal</option>
              <option value="medium">Medium</option>
              <option value="semibold">Semibold</option>
              <option value="bold">Bold</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Align</label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  className={`flex-1 rounded border px-2 py-1 text-xs ${
                    styles.textAlign === a ? 'border-blue-500 bg-blue-50 text-blue-700' : ''
                  }`}
                  onClick={() => set('textAlign', styles.textAlign === a ? undefined : a)}
                >
                  {a === 'left' ? '◀' : a === 'center' ? '◆' : '▶'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>

      {/* Effects */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500">
          ✨ Effects
        </summary>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Opacity</label>
            <input
              type="range"
              className="flex-1"
              min={0}
              max={1}
              step={0.05}
              value={styles.opacity ?? 1}
              onChange={(e) => set('opacity', Number(e.target.value))}
            />
            <span className="w-8 text-right text-xs text-gray-500">
              {Math.round((styles.opacity ?? 1) * 100)}%
            </span>
          </div>
          <div>
            <label className="text-xs text-gray-600">Shadow</label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              value={styles.shadow ?? 'none'}
              onChange={(e) => set('shadow', e.target.value)}
            >
              <option value="none">None</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">Extra Large</option>
            </select>
          </div>
        </div>
      </details>

      {/* Visibility */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500">
          👁 Visibility
        </summary>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={styles.hideOnMobile ?? false}
              onChange={(e) => set('hideOnMobile', e.target.checked)}
            />
            Hide on Mobile
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={styles.hideOnDesktop ?? false}
              onChange={(e) => set('hideOnDesktop', e.target.checked)}
            />
            Hide on Desktop
          </label>
        </div>
      </details>
    </div>
  );
}
