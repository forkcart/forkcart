'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';
import { cn } from '@/lib/utils';

export interface TextBlockProps {
  text?: string;
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

const fontSizeClasses: Record<string, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export const TextBlock: UserComponent<TextBlockProps> = ({
  text = 'Start typing here...',
  alignment = 'left',
  fontSize = 'base',
  color,
  className,
}) => {
  const {
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <StyledBlock>
      <p
        className={cn(fontSizeClasses[fontSize], 'leading-relaxed', className)}
        style={{ textAlign: alignment, color: color || undefined }}
        contentEditable={selected}
        suppressContentEditableWarning
        onBlur={(e) => setProp((p: TextBlockProps) => (p.text = e.currentTarget.textContent ?? ''))}
      >
        {text}
      </p>
    </StyledBlock>
  );
};

function TextBlockSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as TextBlockProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Text</label>
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={4}
          value={props.text ?? ''}
          onChange={(e) => setProp((p: TextBlockProps) => (p.text = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Font Size</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.fontSize ?? 'base'}
          onChange={(e) =>
            setProp(
              (p: TextBlockProps) => (p.fontSize = e.target.value as TextBlockProps['fontSize']),
            )
          }
        >
          <option value="sm">Small</option>
          <option value="base">Normal</option>
          <option value="lg">Large</option>
          <option value="xl">Extra Large</option>
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
                props.alignment === a && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: TextBlockProps) => (p.alignment = a))}
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
          value={props.color ?? '#374151'}
          onChange={(e) => setProp((p: TextBlockProps) => (p.color = e.target.value))}
        />
      </div>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

TextBlock.craft = {
  displayName: 'Text',
  props: {
    text: 'Start typing here...',
    alignment: 'left' as const,
    fontSize: 'base' as const,
    color: '',
  },
  related: {
    settings: TextBlockSettings,
  },
};
