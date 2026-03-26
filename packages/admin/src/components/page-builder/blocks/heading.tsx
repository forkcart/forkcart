'use client';

import React from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';
import { cn } from '@/lib/utils';

export interface HeadingProps {
  text?: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  alignment?: 'left' | 'center' | 'right';
  color?: string;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  h1: 'text-4xl md:text-5xl font-bold',
  h2: 'text-3xl md:text-4xl font-bold',
  h3: 'text-2xl md:text-3xl font-semibold',
  h4: 'text-xl md:text-2xl font-semibold',
  h5: 'text-lg md:text-xl font-medium',
  h6: 'text-base md:text-lg font-medium',
};

export const Heading: UserComponent<HeadingProps> = ({
  text = 'Heading',
  level = 'h2',
  alignment = 'left',
  color,
  className,
}) => {
  const {
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <StyledBlock>
      {React.createElement(
        level,
        {
          className: cn(sizeClasses[level], className),
          style: { textAlign: alignment, color: color || undefined },
          contentEditable: selected,
          suppressContentEditableWarning: true,
          onBlur: (e: React.FocusEvent<HTMLElement>) =>
            setProp((p: HeadingProps) => (p.text = e.currentTarget.textContent ?? '')),
        },
        text,
      )}
    </StyledBlock>
  );
};

function HeadingSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as HeadingProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Text</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.text ?? ''}
          onChange={(e) => setProp((p: HeadingProps) => (p.text = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Level</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.level ?? 'h2'}
          onChange={(e) =>
            setProp((p: HeadingProps) => (p.level = e.target.value as HeadingProps['level']))
          }
        >
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
          <option value="h5">H5</option>
          <option value="h6">H6</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Alignment</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((a) => (
            <button
              key={a}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm capitalize',
                props.alignment === a && 'border-emerald-500 bg-emerald-50 text-emerald-600',
              )}
              onClick={() => setProp((p: HeadingProps) => (p.alignment = a))}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Color</label>
        <input
          type="color"
          className="h-10 w-full rounded border"
          value={props.color ?? '#000000'}
          onChange={(e) => setProp((p: HeadingProps) => (p.color = e.target.value))}
        />
      </div>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

Heading.craft = {
  displayName: 'Heading',
  props: {
    text: 'Heading',
    level: 'h2' as const,
    alignment: 'left' as const,
    color: '',
  },
  related: {
    settings: HeadingSettings,
  },
};
