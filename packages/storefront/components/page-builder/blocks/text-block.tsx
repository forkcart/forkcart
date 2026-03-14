import { cn } from '@/lib/utils';

export interface TextBlockProps {
  text?: string;
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

const fontSizeClasses: Record<string, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export function RenderTextBlock({
  text = '',
  alignment = 'left',
  fontSize = 'base',
  color,
  className,
}: TextBlockProps) {
  return (
    <p
      className={cn(
        fontSizeClasses[fontSize] ?? fontSizeClasses.base,
        'leading-relaxed',
        className,
      )}
      style={{ textAlign: alignment, color: color || undefined }}
    >
      {text}
    </p>
  );
}
