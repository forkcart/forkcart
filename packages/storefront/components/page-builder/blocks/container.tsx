import { cn } from '@/lib/utils';

export interface ContainerProps {
  children?: React.ReactNode;
  paddingX?: number;
  paddingY?: number;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  backgroundColor?: string;
  className?: string;
}

const maxWidthMap: Record<string, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

export function RenderContainer({
  children,
  paddingX = 16,
  paddingY = 16,
  maxWidth = 'xl',
  backgroundColor = 'transparent',
  className,
}: ContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full', maxWidthMap[maxWidth] ?? maxWidthMap.xl, className)}
      style={{
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
