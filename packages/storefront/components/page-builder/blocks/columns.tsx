import { cn } from '@/lib/utils';

export interface ColumnsProps {
  children?: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: number;
  className?: string;
}

const gridClasses: Record<number, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

export function RenderColumns({ children, columns = 2, gap = 24, className }: ColumnsProps) {
  return (
    <div
      className={cn('grid w-full', gridClasses[columns] ?? gridClasses[2], className)}
      style={{ gap }}
    >
      {children}
    </div>
  );
}
