import React from 'react';
import { cn } from '@/lib/utils';

export interface HeadingProps {
  text?: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  alignment?: 'left' | 'center' | 'right';
  color?: string;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  h1: 'text-4xl md:text-5xl font-bold',
  h2: 'text-3xl md:text-4xl font-bold',
  h3: 'text-2xl md:text-3xl font-semibold',
  h4: 'text-xl md:text-2xl font-semibold',
  h5: 'text-lg md:text-xl font-medium',
  h6: 'text-base md:text-lg font-medium',
};

export function RenderHeading({
  text = 'Heading',
  level = 'h2',
  alignment = 'left',
  color,
  className,
}: HeadingProps) {
  return React.createElement(
    level,
    {
      className: cn(sizeClasses[level] ?? sizeClasses.h2, className),
      style: { textAlign: alignment, color: color || undefined },
    },
    text,
  );
}
