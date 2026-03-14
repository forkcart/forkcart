import { cn } from '@/lib/utils';

interface IconGridItem {
  icon: string;
  title: string;
  description: string;
}

interface IconGridProps {
  items?: IconGridItem[];
  columns?: 2 | 3 | 4;
  iconSize?: 'sm' | 'md' | 'lg';
  alignment?: 'left' | 'center';
  className?: string;
}

const gridClasses: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

const iconSizeClasses: Record<string, string> = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl',
};

export function RenderIconGrid({
  items = [],
  columns = 4,
  iconSize = 'md',
  alignment = 'center',
  className,
}: IconGridProps) {
  if (!items.length) return null;

  return (
    <section className={cn('mx-auto w-full max-w-6xl px-6 py-12', className)}>
      <div className={cn('grid gap-8', gridClasses[columns] ?? gridClasses[4])}>
        {items.map((item, idx) => (
          <div
            key={idx}
            className={cn(
              'flex flex-col gap-3',
              alignment === 'center' && 'items-center text-center',
            )}
          >
            <span className={iconSizeClasses[iconSize] ?? iconSizeClasses.md}>{item.icon}</span>
            <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
