'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';

export interface VideoEmbedProps {
  url?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1';
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const aspectClasses: Record<string, string> = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
};

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  full: 'max-w-full',
};

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch?.[1]) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch?.[1]) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

export const VideoEmbed: UserComponent<VideoEmbedProps> = ({
  url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  aspectRatio = '16:9',
  maxWidth = 'lg',
  className,
}) => {
  const {
    connectors: { connect },
  } = useNode();

  const embedUrl = url ? getEmbedUrl(url) : null;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn('mx-auto w-full px-6 py-8', maxWidthClasses[maxWidth], className)}
    >
      {embedUrl ? (
        <div className={cn('w-full overflow-hidden rounded-lg', aspectClasses[aspectRatio])}>
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-lg bg-gray-100 text-gray-400',
            aspectClasses[aspectRatio],
          )}
        >
          Paste a YouTube or Vimeo URL
        </div>
      )}
    </div>
  );
};

function VideoEmbedSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as VideoEmbedProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Video URL</label>
        <input
          type="url"
          placeholder="https://youtube.com/watch?v=..."
          className="w-full rounded border p-2 text-sm"
          value={props.url ?? ''}
          onChange={(e) => setProp((p: VideoEmbedProps) => (p.url = e.target.value))}
        />
        <p className="mt-1 text-xs text-gray-400">Supports YouTube and Vimeo</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Aspect Ratio</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.aspectRatio ?? '16:9'}
          onChange={(e) =>
            setProp(
              (p: VideoEmbedProps) =>
                (p.aspectRatio = e.target.value as VideoEmbedProps['aspectRatio']),
            )
          }
        >
          <option value="16:9">16:9 (Widescreen)</option>
          <option value="4:3">4:3 (Standard)</option>
          <option value="1:1">1:1 (Square)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Max Width</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.maxWidth ?? 'lg'}
          onChange={(e) =>
            setProp(
              (p: VideoEmbedProps) => (p.maxWidth = e.target.value as VideoEmbedProps['maxWidth']),
            )
          }
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
          <option value="full">Full Width</option>
        </select>
      </div>
    </div>
  );
}

VideoEmbed.craft = {
  displayName: 'Video Embed',
  props: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    aspectRatio: '16:9' as const,
    maxWidth: 'lg' as const,
  },
  related: {
    settings: VideoEmbedSettings,
  },
};
