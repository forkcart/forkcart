'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';
import { cn } from '@/lib/utils';

export interface SpacerProps {
  height?: number;
  className?: string;
}

export const Spacer: UserComponent<SpacerProps> = ({ height = 40, className }) => {
  const { selected } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <StyledBlock
      className={cn(
        'w-full',
        selected && 'border border-dashed border-emerald-300 bg-emerald-50/30',
        className,
      )}
    >
      <div style={{ height }} />
    </StyledBlock>
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
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

Spacer.craft = {
  displayName: 'Spacer',
  props: { height: 40 },
  related: { settings: SpacerSettings },
};
