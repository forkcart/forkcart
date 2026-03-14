'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';
import { cn } from '@/lib/utils';

export interface TestimonialItem {
  name: string;
  role: string;
  content: string;
  avatar?: string;
  rating?: number;
}

export interface TestimonialsProps {
  items?: TestimonialItem[];
  columns?: 1 | 2 | 3;
  showRating?: boolean;
  backgroundColor?: string;
  className?: string;
}

const defaultItems: TestimonialItem[] = [
  {
    name: 'Sarah Johnson',
    role: 'Verified Buyer',
    content: 'Amazing quality! The product exceeded my expectations. Will definitely order again.',
    rating: 5,
  },
  {
    name: 'Mike Chen',
    role: 'Repeat Customer',
    content: 'Fast shipping and great customer service. Highly recommended!',
    rating: 5,
  },
  {
    name: 'Emma Davis',
    role: 'Verified Buyer',
    content: 'Love the attention to detail. Beautiful packaging and top-notch quality.',
    rating: 4,
  },
];

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

export const Testimonials: UserComponent<TestimonialsProps> = ({
  items = defaultItems,
  columns = 3,
  showRating = true,
  backgroundColor = '#f9fafb',
  className,
}) => {
  const {
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <StyledBlock className={cn('w-full px-6 py-16', className)}>
      <div style={{ backgroundColor }}>
        <div className="mx-auto max-w-6xl">
          <div className={cn('grid gap-8', gridClasses[columns])}>
            {items.map((item, idx) => (
              <div key={idx} className="rounded-xl bg-white p-6 shadow-sm">
                {showRating && item.rating && <StarRating rating={item.rating} />}
                <p
                  className={cn(
                    'mt-4 text-gray-600 outline-none',
                    selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
                  )}
                  contentEditable={selected}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    setProp((p: TestimonialsProps) => {
                      const list = [...(p.items ?? defaultItems)];
                      list[idx] = { ...list[idx]!, content: e.currentTarget.textContent ?? '' };
                      p.items = list;
                    })
                  }
                >
                  &ldquo;{item.content}&rdquo;
                </p>
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
                    <p
                      className={cn(
                        'text-sm font-semibold text-gray-900 outline-none',
                        selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
                      )}
                      contentEditable={selected}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        setProp((p: TestimonialsProps) => {
                          const list = [...(p.items ?? defaultItems)];
                          list[idx] = { ...list[idx]!, name: e.currentTarget.textContent ?? '' };
                          p.items = list;
                        })
                      }
                    >
                      {item.name}
                    </p>
                    <p
                      className={cn(
                        'text-xs text-gray-500 outline-none',
                        selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
                      )}
                      contentEditable={selected}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        setProp((p: TestimonialsProps) => {
                          const list = [...(p.items ?? defaultItems)];
                          list[idx] = { ...list[idx]!, role: e.currentTarget.textContent ?? '' };
                          p.items = list;
                        })
                      }
                    >
                      {item.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StyledBlock>
  );
};

function TestimonialsSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as TestimonialsProps }));

  const items = props.items ?? defaultItems;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Columns</label>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm',
                (props.columns ?? 3) === n && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: TestimonialsProps) => (p.columns = n))}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={props.showRating ?? true}
            onChange={(e) => setProp((p: TestimonialsProps) => (p.showRating = e.target.checked))}
          />
          Show Ratings
        </label>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Background Color</label>
        <input
          type="color"
          className="h-10 w-full rounded border"
          value={props.backgroundColor ?? '#f9fafb'}
          onChange={(e) => setProp((p: TestimonialsProps) => (p.backgroundColor = e.target.value))}
        />
      </div>
      <hr />
      <h4 className="text-sm font-semibold">Testimonials ({items.length})</h4>
      {items.map((item, idx) => (
        <div key={idx} className="space-y-2 rounded border p-2">
          <input
            type="text"
            placeholder="Name"
            className="w-full rounded border p-1.5 text-sm"
            value={item.name}
            onChange={(e) =>
              setProp((p: TestimonialsProps) => {
                const list = [...(p.items ?? defaultItems)];
                list[idx] = { ...list[idx]!, name: e.target.value };
                p.items = list;
              })
            }
          />
          <input
            type="text"
            placeholder="Role"
            className="w-full rounded border p-1.5 text-sm"
            value={item.role}
            onChange={(e) =>
              setProp((p: TestimonialsProps) => {
                const list = [...(p.items ?? defaultItems)];
                list[idx] = { ...list[idx]!, role: e.target.value };
                p.items = list;
              })
            }
          />
          <textarea
            placeholder="Content"
            rows={2}
            className="w-full rounded border p-1.5 text-sm"
            value={item.content}
            onChange={(e) =>
              setProp((p: TestimonialsProps) => {
                const list = [...(p.items ?? defaultItems)];
                list[idx] = { ...list[idx]!, content: e.target.value };
                p.items = list;
              })
            }
          />
          <button
            className="text-xs text-red-500 hover:text-red-700"
            onClick={() =>
              setProp((p: TestimonialsProps) => {
                const list = [...(p.items ?? defaultItems)];
                list.splice(idx, 1);
                p.items = list;
              })
            }
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className="w-full rounded border border-dashed px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
        onClick={() =>
          setProp((p: TestimonialsProps) => {
            p.items = [
              ...(p.items ?? defaultItems),
              { name: 'New Customer', role: 'Buyer', content: 'Great product!', rating: 5 },
            ];
          })
        }
      >
        + Add Testimonial
      </button>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

Testimonials.craft = {
  displayName: 'Testimonials',
  props: {
    items: defaultItems,
    columns: 3 as const,
    showRating: true,
    backgroundColor: '#f9fafb',
  },
  related: {
    settings: TestimonialsSettings,
  },
};
