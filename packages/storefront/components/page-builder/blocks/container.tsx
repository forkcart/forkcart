import { cn } from '@/lib/utils';

export interface ContainerProps {
  children?: React.ReactNode;
  paddingX?: number;
  paddingY?: number;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  backgroundColor?: string;
  className?: string;
  layout?: 'stack' | 'grid-2' | 'grid-3' | 'grid-4' | 'flex-row';
  gap?: number;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
}

const maxWidthMap: Record<string, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

const layoutStyles: Record<string, React.CSSProperties> = {
  stack: { display: 'flex', flexDirection: 'column' },
  'grid-2': { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  'grid-3': { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' },
  'grid-4': { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' },
  'flex-row': { display: 'flex', flexDirection: 'row' },
};

export function RenderContainer({
  children,
  paddingX = 16,
  paddingY = 16,
  maxWidth = 'xl',
  backgroundColor = 'transparent',
  className,
  layout = 'stack',
  gap = 16,
  alignItems = 'stretch',
}: ContainerProps) {
  const lStyle = layoutStyles[layout] ?? layoutStyles.stack;

  return (
    <div
      className={cn('mx-auto w-full', maxWidthMap[maxWidth] ?? maxWidthMap.xl, className)}
      style={{
        ...lStyle,
        gap,
        alignItems,
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        backgroundColor: backgroundColor !== 'transparent' ? backgroundColor : undefined,
      }}
    >
      {children}
    </div>
  );
}
