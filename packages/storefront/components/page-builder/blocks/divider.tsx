import { cn } from '@/lib/utils';

interface DividerProps {
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  thickness?: number;
  width?: 'full' | '3/4' | '1/2' | '1/4';
  marginY?: number;
  className?: string;
}

const widthClasses: Record<string, string> = {
  full: 'w-full',
  '3/4': 'w-3/4',
  '1/2': 'w-1/2',
  '1/4': 'w-1/4',
};

export function RenderDivider({
  style = 'solid',
  color = '#e5e7eb',
  thickness = 1,
  width = 'full',
  marginY = 32,
  className,
}: DividerProps) {
  return (
    <div
      className={cn('flex w-full justify-center', className)}
      style={{ paddingTop: marginY, paddingBottom: marginY }}
    >
      <hr
        className={widthClasses[width] ?? widthClasses.full}
        style={{
          borderTopStyle: style,
          borderTopColor: color,
          borderTopWidth: thickness,
          borderBottom: 'none',
          borderLeft: 'none',
          borderRight: 'none',
        }}
      />
    </div>
  );
}
