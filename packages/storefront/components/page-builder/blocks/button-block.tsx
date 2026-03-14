import Link from 'next/link';
import { cn } from '@/lib/utils';
import { localePath } from '@/lib/navigation';

export interface ButtonBlockProps {
  text?: string;
  link?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  alignment?: 'left' | 'center' | 'right';
  fullWidth?: boolean;
  className?: string;
  locale?: string;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
  secondary: 'bg-gray-800 text-white hover:bg-gray-900 border-gray-800',
  outline: 'bg-transparent text-gray-800 hover:bg-gray-50 border-gray-300',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-8 py-3 text-lg',
};

export function RenderButtonBlock({
  text = 'Click Me',
  link = '#',
  variant = 'primary',
  size = 'md',
  alignment = 'center',
  fullWidth = false,
  className,
  locale,
}: ButtonBlockProps) {
  return (
    <div
      className={cn('mx-auto w-full max-w-6xl px-6', className)}
      style={{ textAlign: alignment }}
    >
      <Link
        href={localePath(link, locale ?? 'en')}
        className={cn(
          'inline-block rounded-md border font-medium transition-colors',
          variantClasses[variant] ?? variantClasses.primary,
          sizeClasses[size] ?? sizeClasses.md,
          fullWidth && 'block w-full text-center',
        )}
      >
        {text}
      </Link>
    </div>
  );
}
