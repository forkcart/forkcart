import { cn } from '@/lib/utils';
import { stylesToCSS, type BlockStyles } from '../shared/block-styles';

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
  styles?: BlockStyles;
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
  'grid-2': {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
  },
  'grid-3': {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
  },
  'grid-4': {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
  },
  'flex-row': { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' as const },
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
  styles,
}: ContainerProps) {
  const lStyle = layoutStyles[layout] ?? layoutStyles.stack;
  const extraStyles = styles ? stylesToCSS(styles) : {};

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
        ...extraStyles,
      }}
    >
      {children}
    </div>
  );
}
