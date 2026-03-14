'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface SocialLinksProps {
  links?: SocialLink[];
  size?: 'sm' | 'md' | 'lg';
  alignment?: 'left' | 'center' | 'right';
  color?: string;
  className?: string;
}

const defaultLinks: SocialLink[] = [
  { platform: 'Twitter', url: 'https://twitter.com', icon: '𝕏' },
  { platform: 'Instagram', url: 'https://instagram.com', icon: '📷' },
  { platform: 'Facebook', url: 'https://facebook.com', icon: '📘' },
  { platform: 'YouTube', url: 'https://youtube.com', icon: '▶️' },
];

const sizeClasses: Record<string, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-lg',
  lg: 'h-12 w-12 text-xl',
};

export const SocialLinks: UserComponent<SocialLinksProps> = ({
  links = defaultLinks,
  size = 'md',
  alignment = 'center',
  color = '#374151',
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
      className={cn('w-full px-6 py-8', className)}
      style={{ textAlign: alignment }}
    >
      <div className={cn('inline-flex gap-3')}>
        {links.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center justify-center rounded-full border transition-colors hover:bg-gray-100',
              sizeClasses[size],
            )}
            style={{ color }}
            title={link.platform}
            onClick={(e) => e.preventDefault()}
          >
            {link.icon}
          </a>
        ))}
      </div>
    </div>
  );
};

function SocialLinksSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as SocialLinksProps }));

  const links = props.links ?? defaultLinks;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Size</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.size ?? 'md'}
          onChange={(e) =>
            setProp((p: SocialLinksProps) => (p.size = e.target.value as SocialLinksProps['size']))
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
          {(['left', 'center', 'right'] as const).map((a) => (
            <button
              key={a}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm capitalize',
                (props.alignment ?? 'center') === a && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: SocialLinksProps) => (p.alignment = a))}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Icon Color</label>
        <input
          type="color"
          className="h-10 w-full rounded border"
          value={props.color ?? '#374151'}
          onChange={(e) => setProp((p: SocialLinksProps) => (p.color = e.target.value))}
        />
      </div>
      <hr />
      <h4 className="text-sm font-semibold">Links ({links.length})</h4>
      {links.map((link, idx) => (
        <div key={idx} className="space-y-2 rounded border p-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Icon"
              className="w-12 rounded border p-1.5 text-center text-sm"
              value={link.icon}
              onChange={(e) =>
                setProp((p: SocialLinksProps) => {
                  const list = [...(p.links ?? defaultLinks)];
                  list[idx] = { ...list[idx]!, icon: e.target.value };
                  p.links = list;
                })
              }
            />
            <input
              type="text"
              placeholder="Platform"
              className="flex-1 rounded border p-1.5 text-sm"
              value={link.platform}
              onChange={(e) =>
                setProp((p: SocialLinksProps) => {
                  const list = [...(p.links ?? defaultLinks)];
                  list[idx] = { ...list[idx]!, platform: e.target.value };
                  p.links = list;
                })
              }
            />
          </div>
          <input
            type="url"
            placeholder="URL"
            className="w-full rounded border p-1.5 text-sm"
            value={link.url}
            onChange={(e) =>
              setProp((p: SocialLinksProps) => {
                const list = [...(p.links ?? defaultLinks)];
                list[idx] = { ...list[idx]!, url: e.target.value };
                p.links = list;
              })
            }
          />
          <button
            className="text-xs text-red-500 hover:text-red-700"
            onClick={() =>
              setProp((p: SocialLinksProps) => {
                const list = [...(p.links ?? defaultLinks)];
                list.splice(idx, 1);
                p.links = list;
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
          setProp((p: SocialLinksProps) => {
            p.links = [
              ...(p.links ?? defaultLinks),
              { platform: 'Link', url: 'https://', icon: '🔗' },
            ];
          })
        }
      >
        + Add Link
      </button>
    </div>
  );
}

SocialLinks.craft = {
  displayName: 'Social Links',
  props: {
    links: defaultLinks,
    size: 'md' as const,
    alignment: 'center' as const,
    color: '#374151',
  },
  related: {
    settings: SocialLinksSettings,
  },
};
