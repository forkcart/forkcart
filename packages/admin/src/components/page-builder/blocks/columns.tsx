'use client';

import { useNode, Element, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';
import { Container } from './container';

export interface ColumnsProps {
  columns?: 2 | 3 | 4;
  gap?: number;
  className?: string;
}

const gridClasses: Record<number, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

export const Columns: UserComponent<ColumnsProps> = ({ columns = 2, gap = 24, className }) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn('grid w-full', gridClasses[columns], className)}
      style={{ gap }}
    >
      {Array.from({ length: columns }, (_, i) => (
        <Element
          key={i}
          id={`column-${i}`}
          is={Container}
          canvas
          paddingX={0}
          paddingY={0}
          maxWidth="full"
        />
      ))}
    </div>
  );
};

function ColumnsSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as ColumnsProps }));

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
                props.columns === n && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: ColumnsProps) => (p.columns = n))}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Gap ({props.gap ?? 24}px)</label>
        <input
          type="range"
          min="0"
          max="64"
          step="4"
          className="w-full"
          value={props.gap ?? 24}
          onChange={(e) => setProp((p: ColumnsProps) => (p.gap = Number(e.target.value)))}
        />
      </div>
    </div>
  );
}

Columns.craft = {
  displayName: 'Columns',
  props: {
    columns: 2 as const,
    gap: 24,
  },
  related: {
    settings: ColumnsSettings,
  },
};
