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
}

const maxWidthMap: Record<string, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

export const Container: UserComponent<ContainerProps> = ({
  children,
  paddingX = 16,
  paddingY = 16,
  maxWidth = 'xl',
  backgroundColor = 'transparent',
  className,
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn('mx-auto w-full', maxWidthMap[maxWidth], className)}
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
};

function ContainerSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as ContainerProps }));

  return (
    <div className="space-y-4">
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
  },
  rules: {
    canDrag: () => true,
  },
  related: {
    settings: ContainerSettings,
  },
};
