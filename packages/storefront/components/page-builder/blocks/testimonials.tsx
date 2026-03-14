import { cn } from '@/lib/utils';

interface TestimonialItem {
  name: string;
  role: string;
  content: string;
  avatar?: string;
  rating?: number;
}

interface TestimonialsProps {
  items?: TestimonialItem[];
  columns?: 1 | 2 | 3;
  showRating?: boolean;
  backgroundColor?: string;
  className?: string;
}

const gridClasses: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={cn('h-4 w-4', i < rating ? 'text-yellow-400' : 'text-gray-200')}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function RenderTestimonials({
  items = [],
  columns = 3,
  showRating = true,
  backgroundColor = '#f9fafb',
  className,
}: TestimonialsProps) {
  if (!items.length) return null;

  return (
    <section className={cn('w-full px-6 py-16', className)} style={{ backgroundColor }}>
      <div className="mx-auto max-w-6xl">
        <div className={cn('grid gap-8', gridClasses[columns] ?? gridClasses[3])}>
          {items.map((item, idx) => (
            <div key={idx} className="rounded-xl bg-white p-6 shadow-sm">
              {showRating && item.rating && <StarRating rating={item.rating} />}
              <p className="mt-4 text-gray-600">&ldquo;{item.content}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3">
                {item.avatar ? (
                  <img
                    src={item.avatar}
                    alt={item.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    {item.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
