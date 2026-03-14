'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';
import { Mail } from 'lucide-react';

export interface NewsletterProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  backgroundColor?: string;
  textColor?: string;
  layout?: 'stacked' | 'inline';
  className?: string;
}

export const Newsletter: UserComponent<NewsletterProps> = ({
  title = 'Stay Updated',
  subtitle = 'Subscribe to our newsletter for the latest products and exclusive deals.',
  buttonText = 'Subscribe',
  backgroundColor = '#111827',
  textColor = '#ffffff',
  layout = 'stacked',
  className,
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn('w-full rounded-xl px-8 py-12 md:px-16', className)}
      style={{ backgroundColor }}
    >
      <div className={cn('mx-auto max-w-2xl', layout === 'stacked' ? 'text-center' : '')}>
        <Mail className="mx-auto mb-4 h-8 w-8" style={{ color: textColor, opacity: 0.7 }} />
        <h2 className="text-2xl font-bold md:text-3xl" style={{ color: textColor }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-base" style={{ color: textColor, opacity: 0.8 }}>
            {subtitle}
          </p>
        )}
        <div
          className={cn(
            'mt-6',
            layout === 'inline'
              ? 'flex flex-col gap-3 sm:flex-row'
              : 'flex flex-col items-center gap-3 sm:flex-row sm:justify-center',
          )}
        >
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-lg border-0 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 sm:max-w-xs"
            onClick={(e) => e.preventDefault()}
          />
          <button className="whitespace-nowrap rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

function NewsletterSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as NewsletterProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.title ?? ''}
          onChange={(e) => setProp((p: NewsletterProps) => (p.title = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Subtitle</label>
        <textarea
          rows={2}
          className="w-full rounded border p-2 text-sm"
          value={props.subtitle ?? ''}
          onChange={(e) => setProp((p: NewsletterProps) => (p.subtitle = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Button Text</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.buttonText ?? 'Subscribe'}
          onChange={(e) => setProp((p: NewsletterProps) => (p.buttonText = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Layout</label>
        <div className="flex gap-2">
          {(['stacked', 'inline'] as const).map((l) => (
            <button
              key={l}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm capitalize',
                props.layout === l && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: NewsletterProps) => (p.layout = l))}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Background</label>
          <input
            type="color"
            className="h-10 w-full rounded border"
            value={props.backgroundColor ?? '#111827'}
            onChange={(e) => setProp((p: NewsletterProps) => (p.backgroundColor = e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Text Color</label>
          <input
            type="color"
            className="h-10 w-full rounded border"
            value={props.textColor ?? '#ffffff'}
            onChange={(e) => setProp((p: NewsletterProps) => (p.textColor = e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

Newsletter.craft = {
  displayName: 'Newsletter',
  props: {
    title: 'Stay Updated',
    subtitle: 'Subscribe to our newsletter for the latest products and exclusive deals.',
    buttonText: 'Subscribe',
    backgroundColor: '#111827',
    textColor: '#ffffff',
    layout: 'stacked' as const,
  },
  related: {
    settings: NewsletterSettings,
  },
};
