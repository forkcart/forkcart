'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';

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
  'grid-2': { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  'grid-3': { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' },
  'grid-4': { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' },
  'flex-row': { display: 'flex', flexDirection: 'row' },
};

export const Container: UserComponent<ContainerProps> = ({
  children,
  paddingX = 16,
  paddingY = 16,
  maxWidth = 'xl',
  backgroundColor = 'transparent',
  className,
  layout = 'stack',
  gap = 16,
  alignItems = 'stretch',
}) => {
  const {
    connectors: { connect },
  } = useNode();

  const lStyle = layoutStyles[layout] ?? layoutStyles.stack;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn('mx-auto w-full', maxWidthMap[maxWidth], className)}
      style={{
        ...lStyle,
        gap,
        alignItems,
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
};

function ContainerSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as ContainerProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Layout</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.layout ?? 'stack'}
          onChange={(e) =>
            setProp((p: ContainerProps) => (p.layout = e.target.value as ContainerProps['layout']))
          }
        >
          <option value="stack">Stack (vertical)</option>
          <option value="grid-2">2-Column Grid</option>
          <option value="grid-3">3-Column Grid</option>
          <option value="grid-4">4-Column Grid</option>
          <option value="flex-row">Horizontal Row</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Gap (px)</label>
        <input
          type="number"
          className="w-full rounded border p-2 text-sm"
          value={props.gap ?? 16}
          min={0}
          step={4}
          onChange={(e) => setProp((p: ContainerProps) => (p.gap = Number(e.target.value)))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Max Width</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.maxWidth ?? 'xl'}
          onChange={(e) =>
            setProp(
              (p: ContainerProps) => (p.maxWidth = e.target.value as ContainerProps['maxWidth']),
            )
          }
        >
          <option value="sm">Small (672px)</option>
          <option value="md">Medium (896px)</option>
          <option value="lg">Large (1152px)</option>
          <option value="xl">Extra Large (1280px)</option>
          <option value="full">Full Width</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Align Items</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.alignItems ?? 'stretch'}
          onChange={(e) =>
            setProp(
              (p: ContainerProps) =>
                (p.alignItems = e.target.value as ContainerProps['alignItems']),
            )
          }
        >
          <option value="stretch">Stretch</option>
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Padding X</label>
          <input
            type="number"
            className="w-full rounded border p-2 text-sm"
            value={props.paddingX ?? 16}
            onChange={(e) => setProp((p: ContainerProps) => (p.paddingX = Number(e.target.value)))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Padding Y</label>
          <input
            type="number"
            className="w-full rounded border p-2 text-sm"
            value={props.paddingY ?? 16}
            onChange={(e) => setProp((p: ContainerProps) => (p.paddingY = Number(e.target.value)))}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Background Color</label>
        <input
          type="color"
          className="h-10 w-full rounded border"
          value={
            props.backgroundColor === 'transparent'
              ? '#ffffff'
              : (props.backgroundColor ?? '#ffffff')
          }
          onChange={(e) => setProp((p: ContainerProps) => (p.backgroundColor = e.target.value))}
        />
      </div>
    </div>
  );
}

Container.craft = {
  displayName: 'Container',
  props: {
    paddingX: 16,
    paddingY: 16,
    maxWidth: 'xl' as const,
    backgroundColor: 'transparent',
    layout: 'stack' as const,
    gap: 16,
    alignItems: 'stretch' as const,
  },
  rules: {
    canDrag: () => true,
  },
  related: {
    settings: ContainerSettings,
  },
};
