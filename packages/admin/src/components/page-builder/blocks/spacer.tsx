'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';

export interface SpacerProps {
  height?: number;
  className?: string;
}

export const Spacer: UserComponent<SpacerProps> = ({ height = 40, className }) => {
  const {
    connectors: { connect },
    selected,
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn(
        'w-full',
        selected && 'border border-dashed border-blue-300 bg-blue-50/30',
        className,
      )}
      style={{ height }}
    />
  );
};

function SpacerSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as SpacerProps }));

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Height ({props.height ?? 40}px)</label>
      <input
        type="range"
        min="8"
        max="200"
        step="8"
        className="w-full"
        value={props.height ?? 40}
        onChange={(e) => setProp((p: SpacerProps) => (p.height = Number(e.target.value)))}
      />
    </div>
  );
}

Spacer.craft = {
  displayName: 'Spacer',
  props: { height: 40 },
  related: { settings: SpacerSettings },
};
