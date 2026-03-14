'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';

export interface DividerProps {
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

export const Divider: UserComponent<DividerProps> = ({
  style = 'solid',
  color = '#e5e7eb',
  thickness = 1,
  width = 'full',
  marginY = 32,
  className,
}) => {
  return (
    <StyledBlock className={cn('flex w-full justify-center', className)}>
      <div
        style={{
          paddingTop: marginY,
          paddingBottom: marginY,
          display: 'flex',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <hr
          className={cn(widthClasses[width])}
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
    </StyledBlock>
  );
};

function DividerSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as DividerProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Style</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.style ?? 'solid'}
          onChange={(e) =>
            setProp((p: DividerProps) => (p.style = e.target.value as DividerProps['style']))
          }
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Color</label>
        <input
          type="color"
          className="h-10 w-full rounded border"
          value={props.color ?? '#e5e7eb'}
          onChange={(e) => setProp((p: DividerProps) => (p.color = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Thickness ({props.thickness ?? 1}px)
        </label>
        <input
          type="range"
          min="1"
          max="8"
          className="w-full"
          value={props.thickness ?? 1}
          onChange={(e) => setProp((p: DividerProps) => (p.thickness = Number(e.target.value)))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Width</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.width ?? 'full'}
          onChange={(e) =>
            setProp((p: DividerProps) => (p.width = e.target.value as DividerProps['width']))
          }
        >
          <option value="full">Full</option>
          <option value="3/4">75%</option>
          <option value="1/2">50%</option>
          <option value="1/4">25%</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Vertical Margin ({props.marginY ?? 32}px)
        </label>
        <input
          type="range"
          min="0"
          max="80"
          step="4"
          className="w-full"
          value={props.marginY ?? 32}
          onChange={(e) => setProp((p: DividerProps) => (p.marginY = Number(e.target.value)))}
        />
      </div>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

Divider.craft = {
  displayName: 'Divider',
  props: {
    style: 'solid' as const,
    color: '#e5e7eb',
    thickness: 1,
    width: 'full' as const,
    marginY: 32,
  },
  related: {
    settings: DividerSettings,
  },
};
