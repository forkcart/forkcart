import { cn } from '@/lib/utils';

export interface SpacerProps {
  height?: number;
  className?: string;
}

export function RenderSpacer({ height = 40, className }: SpacerProps) {
  return <div className={cn('w-full', className)} style={{ height }} />;
}
