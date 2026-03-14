'use client';

import { useNode } from '@craftjs/core';

export interface BlockStyles {
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  bgColor?: string;
  textColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  minHeight?: number;
  maxWidth?: number;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
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

// ── Shared UI components ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-gray-100 pt-3 first:border-0 first:pt-0">
      <summary className="flex cursor-pointer select-none items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700">
        {title}
        <svg
          className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </summary>
      <div className="mt-2.5 space-y-2.5">{children}</div>
    </details>
  );
}

function NumberGrid({
  labels,
  keys,
  styles,
  set,
}: {
  labels: string[];
  keys: (keyof BlockStyles)[];
  styles: BlockStyles;
  set: (k: keyof BlockStyles, v: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {keys.map((k, i) => (
        <div key={k}>
          <label className="mb-0.5 block text-center text-[10px] text-gray-400">{labels[i]}</label>
          <input
            type="number"
            className="w-full rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-center text-xs focus:border-blue-400 focus:bg-white focus:outline-none"
            value={(styles[k] as number) ?? 0}
            step={4}
            onChange={(e) => set(k, Number(e.target.value) || 0)}
          />
        </div>
      ))}
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  onClear,
  fallback,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  onClear: () => void;
  fallback: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[70px] text-xs text-gray-500">{label}</span>
      <input
        type="color"
        className="h-7 w-8 cursor-pointer rounded border border-gray-200"
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="flex-1 text-[10px] text-gray-400">{value || '—'}</span>
      {value && (
        <button
          className="text-[10px] text-gray-400 hover:text-red-500"
          onClick={onClear}
          title="Reset"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ── Main StyleSettings Panel ─────────────────────────────────────────────────

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
    <div className="space-y-3">
      <Section title="Spacing">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Margin</p>
        <NumberGrid
          labels={['Top', 'Right', 'Bottom', 'Left']}
          keys={['marginTop', 'marginRight', 'marginBottom', 'marginLeft']}
          styles={styles}
          set={set}
        />
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Padding
        </p>
        <NumberGrid
          labels={['Top', 'Right', 'Bottom', 'Left']}
          keys={['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']}
          styles={styles}
          set={set}
        />
      </Section>

      <Section title="Colors">
        <ColorRow
          label="Background"
          value={styles.bgColor}
          onChange={(v) => set('bgColor', v)}
          onClear={() => set('bgColor', undefined)}
          fallback="#ffffff"
        />
        <ColorRow
          label="Text"
          value={styles.textColor}
          onChange={(v) => set('textColor', v)}
          onClear={() => set('textColor', undefined)}
          fallback="#111827"
        />
      </Section>

      <Section title="Border">
        <div>
          <label className="text-xs text-gray-500">Style</label>
          <select
            className="mt-0.5 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs focus:border-blue-400 focus:bg-white focus:outline-none"
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
              <span className="min-w-[70px] text-xs text-gray-500">Width</span>
              <input
                type="number"
                className="w-16 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
                value={styles.borderWidth ?? 1}
                min={1}
                max={10}
                onChange={(e) => set('borderWidth', Number(e.target.value))}
              />
              <span className="text-[10px] text-gray-400">px</span>
            </div>
            <ColorRow
              label="Color"
              value={styles.borderColor}
              onChange={(v) => set('borderColor', v)}
              onClear={() => set('borderColor', undefined)}
              fallback="#e5e7eb"
            />
          </>
        )}
        <div className="flex items-center gap-2">
          <span className="min-w-[70px] text-xs text-gray-500">Radius</span>
          <input
            type="number"
            className="w-16 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
            value={styles.borderRadius ?? 0}
            min={0}
            step={2}
            onChange={(e) => set('borderRadius', Number(e.target.value))}
          />
          <span className="text-[10px] text-gray-400">px</span>
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex items-center gap-2">
          <span className="min-w-[70px] text-xs text-gray-500">Size</span>
          <input
            type="number"
            className="w-16 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
            value={styles.fontSize ?? ''}
            placeholder="—"
            min={8}
            max={72}
            onChange={(e) => set('fontSize', e.target.value ? Number(e.target.value) : undefined)}
          />
          <span className="text-[10px] text-gray-400">px</span>
        </div>
        <div>
          <label className="text-xs text-gray-500">Weight</label>
          <select
            className="mt-0.5 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
            value={styles.fontWeight ?? ''}
            onChange={(e) => set('fontWeight', e.target.value || undefined)}
          >
            <option value="">Default</option>
            <option value="normal">Normal (400)</option>
            <option value="medium">Medium (500)</option>
            <option value="semibold">Semibold (600)</option>
            <option value="bold">Bold (700)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Alignment</label>
          <div className="mt-0.5 flex gap-0.5">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition ${
                  styles.textAlign === a
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                onClick={() => set('textAlign', styles.textAlign === a ? undefined : a)}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Effects">
        <div className="flex items-center gap-2">
          <span className="min-w-[70px] text-xs text-gray-500">Opacity</span>
          <input
            type="range"
            className="flex-1 accent-gray-900"
            min={0}
            max={1}
            step={0.05}
            value={styles.opacity ?? 1}
            onChange={(e) => set('opacity', Number(e.target.value))}
          />
          <span className="w-8 text-right text-[10px] tabular-nums text-gray-500">
            {Math.round((styles.opacity ?? 1) * 100)}%
          </span>
        </div>
        <div>
          <label className="text-xs text-gray-500">Shadow</label>
          <select
            className="mt-0.5 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
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
      </Section>

      <Section title="Visibility">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="rounded accent-gray-900"
            checked={styles.hideOnMobile ?? false}
            onChange={(e) => set('hideOnMobile', e.target.checked)}
          />
          Hide on mobile
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="rounded accent-gray-900"
            checked={styles.hideOnDesktop ?? false}
            onChange={(e) => set('hideOnDesktop', e.target.checked)}
          />
          Hide on desktop
        </label>
      </Section>
    </div>
  );
}
