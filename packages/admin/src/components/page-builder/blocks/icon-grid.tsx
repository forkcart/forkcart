'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';

export interface IconGridItem {
  icon: string;
  title: string;
  description: string;
}

export interface IconGridProps {
  items?: IconGridItem[];
  columns?: 2 | 3 | 4;
  iconSize?: 'sm' | 'md' | 'lg';
  alignment?: 'left' | 'center';
  className?: string;
}

const defaultItems: IconGridItem[] = [
  { icon: '🚚', title: 'Free Shipping', description: 'On orders over $50' },
  { icon: '🔒', title: 'Secure Payment', description: '100% secure checkout' },
  { icon: '↩️', title: 'Easy Returns', description: '30-day return policy' },
  { icon: '💬', title: '24/7 Support', description: 'We are here to help' },
];

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

export const IconGrid: UserComponent<IconGridProps> = ({
  items = defaultItems,
  columns = 4,
  iconSize = 'md',
  alignment = 'center',
  className,
}) => {
  const {
    connectors: { connect },
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <section
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn('mx-auto w-full max-w-6xl px-6 py-12', className)}
    >
      <div className={cn('grid gap-8', gridClasses[columns])}>
        {items.map((item, idx) => (
          <div
            key={idx}
            className={cn(
              'flex flex-col gap-3',
              alignment === 'center' && 'items-center text-center',
            )}
          >
            <span className={iconSizeClasses[iconSize]}>{item.icon}</span>
            <h3
              className={cn(
                'text-lg font-semibold text-gray-900 outline-none',
                selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
              )}
              contentEditable={selected}
              suppressContentEditableWarning
              onBlur={(e) =>
                setProp((p: IconGridProps) => {
                  const list = [...(p.items ?? defaultItems)];
                  list[idx] = { ...list[idx]!, title: e.currentTarget.textContent ?? '' };
                  p.items = list;
                })
              }
            >
              {item.title}
            </h3>
            <p
              className={cn(
                'text-sm text-gray-500 outline-none',
                selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
              )}
              contentEditable={selected}
              suppressContentEditableWarning
              onBlur={(e) =>
                setProp((p: IconGridProps) => {
                  const list = [...(p.items ?? defaultItems)];
                  list[idx] = { ...list[idx]!, description: e.currentTarget.textContent ?? '' };
                  p.items = list;
                })
              }
            >
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

function IconGridSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as IconGridProps }));

  const items = props.items ?? defaultItems;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Columns</label>
        <div className="flex gap-2">
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm',
                (props.columns ?? 4) === n && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: IconGridProps) => (p.columns = n))}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Icon Size</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.iconSize ?? 'md'}
          onChange={(e) =>
            setProp(
              (p: IconGridProps) => (p.iconSize = e.target.value as IconGridProps['iconSize']),
            )
          }
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Alignment</label>
        <div className="flex gap-2">
          {(['left', 'center'] as const).map((a) => (
            <button
              key={a}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm capitalize',
                (props.alignment ?? 'center') === a && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: IconGridProps) => (p.alignment = a))}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <hr />
      <h4 className="text-sm font-semibold">Features ({items.length})</h4>
      {items.map((item, idx) => (
        <div key={idx} className="space-y-2 rounded border p-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Icon (emoji)"
              className="w-16 rounded border p-1.5 text-center text-sm"
              value={item.icon}
              onChange={(e) =>
                setProp((p: IconGridProps) => {
                  const list = [...(p.items ?? defaultItems)];
                  list[idx] = { ...list[idx]!, icon: e.target.value };
                  p.items = list;
                })
              }
            />
            <input
              type="text"
              placeholder="Title"
              className="flex-1 rounded border p-1.5 text-sm"
              value={item.title}
              onChange={(e) =>
                setProp((p: IconGridProps) => {
                  const list = [...(p.items ?? defaultItems)];
                  list[idx] = { ...list[idx]!, title: e.target.value };
                  p.items = list;
                })
              }
            />
          </div>
          <input
            type="text"
            placeholder="Description"
            className="w-full rounded border p-1.5 text-sm"
            value={item.description}
            onChange={(e) =>
              setProp((p: IconGridProps) => {
                const list = [...(p.items ?? defaultItems)];
                list[idx] = { ...list[idx]!, description: e.target.value };
                p.items = list;
              })
            }
          />
          <button
            className="text-xs text-red-500 hover:text-red-700"
            onClick={() =>
              setProp((p: IconGridProps) => {
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
          setProp((p: IconGridProps) => {
            p.items = [
              ...(p.items ?? defaultItems),
              { icon: '⭐', title: 'New Feature', description: 'Description here' },
            ];
          })
        }
      >
        + Add Feature
      </button>
    </div>
  );
}

IconGrid.craft = {
  displayName: 'Icon Grid',
  props: {
    items: defaultItems,
    columns: 4 as const,
    iconSize: 'md' as const,
    alignment: 'center' as const,
  },
  related: {
    settings: IconGridSettings,
  },
};
