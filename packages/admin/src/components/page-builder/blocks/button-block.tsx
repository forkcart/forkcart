'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';

export interface ButtonBlockProps {
  text?: string;
  link?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  alignment?: 'left' | 'center' | 'right';
  fullWidth?: boolean;
  className?: string;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
  secondary: 'bg-gray-800 text-white hover:bg-gray-900 border-gray-800',
  outline: 'bg-transparent text-gray-800 hover:bg-gray-50 border-gray-300',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-8 py-3 text-lg',
};

export const ButtonBlock: UserComponent<ButtonBlockProps> = ({
  text = 'Click Me',
  link = '#',
  variant = 'primary',
  size = 'md',
  alignment = 'center',
  fullWidth = false,
  className,
}) => {
  const {
    connectors: { connect },
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn('w-full', className)}
      style={{ textAlign: alignment }}
    >
      <a
        href={link}
        className={cn(
          'inline-block rounded-md border font-medium transition-colors',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'block w-full text-center',
        )}
        onClick={(e) => e.preventDefault()}
      >
        <span
          className={cn(
            'outline-none',
            selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
          )}
          contentEditable={selected}
          suppressContentEditableWarning
          onBlur={(e) =>
            setProp((p: ButtonBlockProps) => (p.text = e.currentTarget.textContent ?? ''))
          }
        >
          {text}
        </span>
      </a>
    </div>
  );
};

function ButtonBlockSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as ButtonBlockProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Text</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.text ?? ''}
          onChange={(e) => setProp((p: ButtonBlockProps) => (p.text = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Link</label>
        <input
          type="url"
          className="w-full rounded border p-2 text-sm"
          value={props.link ?? '#'}
          onChange={(e) => setProp((p: ButtonBlockProps) => (p.link = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Variant</label>
        <div className="flex gap-2">
          {(['primary', 'secondary', 'outline'] as const).map((v) => (
            <button
              key={v}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm capitalize',
                props.variant === v && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: ButtonBlockProps) => (p.variant = v))}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Size</label>
        <div className="flex gap-2">
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <button
              key={s}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm uppercase',
                props.size === s && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: ButtonBlockProps) => (p.size = s))}
            >
              {s}
            </button>
          ))}
        </div>
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
              onClick={() => setProp((p: ButtonBlockProps) => (p.alignment = a))}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="fullWidth"
          checked={props.fullWidth ?? false}
          onChange={(e) => setProp((p: ButtonBlockProps) => (p.fullWidth = e.target.checked))}
        />
        <label htmlFor="fullWidth" className="text-sm font-medium">
          Full Width
        </label>
      </div>
    </div>
  );
}

ButtonBlock.craft = {
  displayName: 'Button',
  props: {
    text: 'Click Me',
    link: '#',
    variant: 'primary' as const,
    size: 'md' as const,
    alignment: 'center' as const,
    fullWidth: false,
  },
  related: {
    settings: ButtonBlockSettings,
  },
};
