'use client';

import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsletterProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  backgroundColor?: string;
  textColor?: string;
  layout?: 'stacked' | 'inline';
}

export function RenderNewsletter({
  title = 'Stay Updated',
  subtitle = 'Subscribe to our newsletter for the latest products and exclusive deals.',
  buttonText = 'Subscribe',
  backgroundColor = '#111827',
  textColor = '#ffffff',
  layout = 'stacked',
}: NewsletterProps) {
  return (
    <section className="w-full rounded-xl px-8 py-12 md:px-16" style={{ backgroundColor }}>
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
        <form
          className={cn(
            'mt-6',
            layout === 'inline'
              ? 'flex flex-col gap-3 sm:flex-row'
              : 'flex flex-col items-center gap-3 sm:flex-row sm:justify-center',
          )}
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-lg border-0 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 sm:max-w-xs"
            required
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {buttonText}
          </button>
        </form>
      </div>
    </section>
  );
}
