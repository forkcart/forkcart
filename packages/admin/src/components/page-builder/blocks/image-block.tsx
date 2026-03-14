'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';
import { ImageUpload } from '../image-upload';

export interface ImageBlockProps {
  src?: string;
  alt?: string;
  aspectRatio?: 'auto' | '1:1' | '16:9' | '4:3' | '3:2';
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
  link?: string;
  className?: string;
}

const aspectRatioClasses: Record<string, string> = {
  auto: '',
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '3:2': 'aspect-[3/2]',
};

export const ImageBlock: UserComponent<ImageBlockProps> = ({
  src,
  alt = '',
  aspectRatio = 'auto',
  objectFit = 'cover',
  borderRadius = 0,
  link,
  className,
}) => {
  const content = src ? (
    <img
      src={src}
      alt={alt}
      className={cn('w-full', aspectRatioClasses[aspectRatio])}
      style={{
        objectFit,
        borderRadius: borderRadius > 0 ? borderRadius : undefined,
      }}
    />
  ) : (
    <div
      className={cn(
        'flex min-h-[200px] w-full items-center justify-center bg-gray-100',
        aspectRatioClasses[aspectRatio],
      )}
      style={{ borderRadius: borderRadius > 0 ? borderRadius : undefined }}
    >
      <div className="text-center text-gray-400">
        <ImageIcon className="mx-auto mb-2 h-10 w-10" />
        <p className="text-sm">Click to add image URL</p>
      </div>
    </div>
  );

  const wrapper = link ? (
    <a href={link} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    content
  );

  return (
    <StyledBlock className={cn('w-full', className)}>
      {wrapper}
    </StyledBlock>
  );
};

function ImageBlockSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as ImageBlockProps }));

  return (
    <div className="space-y-4">
      <ImageUpload
        label="Image"
        value={props.src ?? ''}
        onChange={(url) => setProp((p: ImageBlockProps) => (p.src = url))}
      />
      <div>
        <label className="mb-1 block text-sm font-medium">Alt Text</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.alt ?? ''}
          onChange={(e) => setProp((p: ImageBlockProps) => (p.alt = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Aspect Ratio</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.aspectRatio ?? 'auto'}
          onChange={(e) =>
            setProp(
              (p: ImageBlockProps) =>
                (p.aspectRatio = e.target.value as ImageBlockProps['aspectRatio']),
            )
          }
        >
          <option value="auto">Auto</option>
          <option value="1:1">Square (1:1)</option>
          <option value="16:9">Wide (16:9)</option>
          <option value="4:3">Standard (4:3)</option>
          <option value="3:2">Photo (3:2)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Object Fit</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.objectFit ?? 'cover'}
          onChange={(e) =>
            setProp(
              (p: ImageBlockProps) =>
                (p.objectFit = e.target.value as ImageBlockProps['objectFit']),
            )
          }
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Border Radius</label>
        <input
          type="range"
          min="0"
          max="24"
          className="w-full"
          value={props.borderRadius ?? 0}
          onChange={(e) =>
            setProp((p: ImageBlockProps) => (p.borderRadius = Number(e.target.value)))
          }
        />
        <span className="text-xs text-gray-500">{props.borderRadius ?? 0}px</span>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Link (optional)</label>
        <input
          type="url"
          placeholder="https://..."
          className="w-full rounded border p-2 text-sm"
          value={props.link ?? ''}
          onChange={(e) => setProp((p: ImageBlockProps) => (p.link = e.target.value))}
        />
      </div>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

ImageBlock.craft = {
  displayName: 'Image',
  props: {
    src: '',
    alt: '',
    aspectRatio: 'auto' as const,
    objectFit: 'cover' as const,
    borderRadius: 0,
    link: '',
  },
  related: {
    settings: ImageBlockSettings,
  },
};
