'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';

export interface MapEmbedProps {
  query?: string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

function getMapUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export const MapEmbed: UserComponent<MapEmbedProps> = ({
  query = 'New York, NY',
  height = 400,
  borderRadius = 12,
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
    >
      <iframe
        src={getMapUrl(query)}
        width="100%"
        height={height}
        style={{ border: 0, borderRadius }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Map"
      />
    </div>
  );
};

function MapEmbedSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as MapEmbedProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Location / Address</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          placeholder="e.g. 1600 Amphitheatre Parkway, Mountain View"
          value={props.query ?? ''}
          onChange={(e) => setProp((p: MapEmbedProps) => (p.query = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Height ({props.height ?? 400}px)</label>
        <input
          type="range"
          min="200"
          max="600"
          step="50"
          className="w-full"
          value={props.height ?? 400}
          onChange={(e) => setProp((p: MapEmbedProps) => (p.height = Number(e.target.value)))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Border Radius ({props.borderRadius ?? 12}px)
        </label>
        <input
          type="range"
          min="0"
          max="24"
          className="w-full"
          value={props.borderRadius ?? 12}
          onChange={(e) => setProp((p: MapEmbedProps) => (p.borderRadius = Number(e.target.value)))}
        />
      </div>
    </div>
  );
}

MapEmbed.craft = {
  displayName: 'Map',
  props: {
    query: 'New York, NY',
    height: 400,
    borderRadius: 12,
  },
  related: {
    settings: MapEmbedSettings,
  },
};
