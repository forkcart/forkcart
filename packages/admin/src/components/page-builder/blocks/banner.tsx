'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';

export interface BannerProps {
  text?: string;
  linkText?: string;
  linkUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  dismissible?: boolean;
  className?: string;
}

export const Banner: UserComponent<BannerProps> = ({
  text = '🎉 Free shipping on all orders over $50!',
  linkText = 'Shop Now',
  linkUrl = '/products',
  backgroundColor = '#1f2937',
  textColor = '#ffffff',
  dismissible = false,
  className,
}) => {
  const {
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <StyledBlock className={cn('relative w-full px-4 py-3 text-center', className)}>
      <div style={{ backgroundColor, color: textColor }}>
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3">
          <p
            className={cn(
              'text-sm font-medium outline-none',
              selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
            )}
            contentEditable={selected}
            suppressContentEditableWarning
            onBlur={(e) =>
              setProp((p: BannerProps) => (p.text = e.currentTarget.textContent ?? ''))
            }
          >
            {text}
          </p>
          {linkText && (
            <a
              href={linkUrl}
              className="shrink-0 text-sm font-semibold underline underline-offset-2 hover:opacity-80"
              style={{ color: textColor }}
              onClick={(e) => e.preventDefault()}
            >
              {linkText} →
            </a>
          )}
        </div>
        {dismissible && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-60 hover:opacity-100"
            style={{ color: textColor }}
            onClick={(e) => e.preventDefault()}
          >
            ✕
          </button>
        )}
      </div>
    </StyledBlock>
  );
};

function BannerSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as BannerProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Text</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.text ?? ''}
          onChange={(e) => setProp((p: BannerProps) => (p.text = e.target.value))}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Link Text</label>
          <input
            type="text"
            className="w-full rounded border p-2 text-sm"
            value={props.linkText ?? ''}
            onChange={(e) => setProp((p: BannerProps) => (p.linkText = e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Link URL</label>
          <input
            type="text"
            className="w-full rounded border p-2 text-sm"
            value={props.linkUrl ?? '#'}
            onChange={(e) => setProp((p: BannerProps) => (p.linkUrl = e.target.value))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Background</label>
          <input
            type="color"
            className="h-10 w-full rounded border"
            value={props.backgroundColor ?? '#1f2937'}
            onChange={(e) => setProp((p: BannerProps) => (p.backgroundColor = e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Text Color</label>
          <input
            type="color"
            className="h-10 w-full rounded border"
            value={props.textColor ?? '#ffffff'}
            onChange={(e) => setProp((p: BannerProps) => (p.textColor = e.target.value))}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={props.dismissible ?? false}
            onChange={(e) => setProp((p: BannerProps) => (p.dismissible = e.target.checked))}
          />
          Dismissible
        </label>
      </div>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

Banner.craft = {
  displayName: 'Banner',
  props: {
    text: '🎉 Free shipping on all orders over $50!',
    linkText: 'Shop Now',
    linkUrl: '/products',
    backgroundColor: '#1f2937',
    textColor: '#ffffff',
    dismissible: false,
  },
  related: {
    settings: BannerSettings,
  },
};
