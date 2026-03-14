'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BannerProps {
  text?: string;
  linkText?: string;
  linkUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  dismissible?: boolean;
  className?: string;
}

export function RenderBanner({
  text = '🎉 Free shipping on all orders over $50!',
  linkText = 'Shop Now',
  linkUrl = '/products',
  backgroundColor = '#1f2937',
  textColor = '#ffffff',
  dismissible = false,
  className,
}: BannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn('relative w-full px-4 py-3 text-center', className)}
      style={{ backgroundColor, color: textColor }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3">
        <p className="text-sm font-medium">{text}</p>
        {linkText && linkUrl && (
          <Link
            href={linkUrl}
            className="shrink-0 text-sm font-semibold underline underline-offset-2 hover:opacity-80"
            style={{ color: textColor }}
          >
            {linkText} →
          </Link>
        )}
      </div>
      {dismissible && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-60 hover:opacity-100"
          style={{ color: textColor }}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      )}
    </div>
  );
}
