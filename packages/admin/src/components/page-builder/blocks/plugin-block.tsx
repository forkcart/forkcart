'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';

export interface PluginBlockProps {
  pluginName: string;
  blockName: string;
  label?: string;
  icon?: string;
  description?: string;
  className?: string;
}

export const PluginBlock: UserComponent<PluginBlockProps> = ({
  pluginName,
  blockName,
  label,
  icon,
  description,
}) => {
  const { selected } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50 p-4',
        selected && 'border-purple-500 ring-2 ring-purple-200',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-lg">
        {icon || '🧩'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-purple-900">{label || blockName}</p>
        <p className="truncate text-xs text-purple-600">
          {pluginName}
          {description && ` · ${description}`}
        </p>
      </div>
    </div>
  );
};

function PluginBlockSettings() {
  const { props } = useNode((node) => ({ props: node.data.props as PluginBlockProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Plugin</label>
        <p className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">{props.pluginName}</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Block</label>
        <p className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">{props.blockName}</p>
      </div>
      {props.label && (
        <div>
          <label className="mb-1 block text-sm font-medium">Label</label>
          <p className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">{props.label}</p>
        </div>
      )}
      {props.description && (
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <p className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">{props.description}</p>
        </div>
      )}
      <p className="text-xs text-gray-400">
        Plugin blocks are configured by the plugin. Content renders on the storefront.
      </p>
    </div>
  );
}

PluginBlock.craft = {
  displayName: 'Plugin Block',
  props: {
    pluginName: '',
    blockName: '',
    label: '',
    icon: '',
    description: '',
  },
  related: {
    settings: PluginBlockSettings,
  },
};
