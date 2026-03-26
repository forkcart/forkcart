'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';
import { cn } from '@/lib/utils';
import { ImageUpload } from '../image-upload';

export interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  overlayOpacity?: number;
  height?: 'sm' | 'md' | 'lg' | 'xl';
  alignment?: 'left' | 'center' | 'right';
  textColor?: string;
  className?: string;
}

const heightClasses: Record<string, string> = {
  sm: 'min-h-[300px]',
  md: 'min-h-[400px]',
  lg: 'min-h-[500px]',
  xl: 'min-h-[600px]',
};

export const Hero: UserComponent<HeroProps> = ({
  title = 'Welcome to Our Store',
  subtitle = 'Discover amazing products at great prices',
  ctaText = 'Shop Now',
  ctaLink = '/products',
  backgroundImage,
  backgroundColor = '#1f2937',
  overlayOpacity = 40,
  height = 'lg',
  alignment = 'center',
  textColor = '#ffffff',
  className,
}) => {
  const {
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <StyledBlock
      className={cn(
        'relative flex w-full items-center overflow-hidden',
        heightClasses[height],
        className,
      )}
    >
      <div
        style={{
          backgroundColor,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minHeight: 'inherit',
          overflow: 'hidden',
        }}
      >
        {backgroundImage && (
          <>
            <img
              src={backgroundImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity / 100 }} />
          </>
        )}
        <div
          className={cn('relative z-10 mx-auto w-full max-w-6xl px-6')}
          style={{ textAlign: alignment }}
        >
          <h1
            className={cn(
              'mb-4 text-4xl font-bold outline-none md:text-5xl lg:text-6xl',
              selected && 'cursor-text rounded ring-1 ring-emerald-300 ring-offset-1',
            )}
            style={{ color: textColor }}
            contentEditable={selected}
            suppressContentEditableWarning
            onBlur={(e) => setProp((p: HeroProps) => (p.title = e.currentTarget.textContent ?? ''))}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'mb-8 text-lg outline-none md:text-xl',
                selected && 'cursor-text rounded ring-1 ring-emerald-300 ring-offset-1',
              )}
              style={{ color: textColor, opacity: 0.9 }}
              contentEditable={selected}
              suppressContentEditableWarning
              onBlur={(e) =>
                setProp((p: HeroProps) => (p.subtitle = e.currentTarget.textContent ?? ''))
              }
            >
              {subtitle}
            </p>
          )}
          {ctaText && (
            <a
              href={ctaLink}
              className="inline-block rounded-lg bg-white px-8 py-3 text-lg font-semibold text-gray-900 transition-colors hover:bg-gray-100"
              onClick={(e) => e.preventDefault()}
            >
              {ctaText}
            </a>
          )}
        </div>
      </div>
    </StyledBlock>
  );
};

function HeroSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as HeroProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.title ?? ''}
          onChange={(e) => setProp((p: HeroProps) => (p.title = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Subtitle</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.subtitle ?? ''}
          onChange={(e) => setProp((p: HeroProps) => (p.subtitle = e.target.value))}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">CTA Text</label>
          <input
            type="text"
            className="w-full rounded border p-2 text-sm"
            value={props.ctaText ?? ''}
            onChange={(e) => setProp((p: HeroProps) => (p.ctaText = e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">CTA Link</label>
          <input
            type="text"
            className="w-full rounded border p-2 text-sm"
            value={props.ctaLink ?? '#'}
            onChange={(e) => setProp((p: HeroProps) => (p.ctaLink = e.target.value))}
          />
        </div>
      </div>
      <ImageUpload
        label="Background Image"
        value={props.backgroundImage ?? ''}
        onChange={(url) => setProp((p: HeroProps) => (p.backgroundImage = url))}
      />
      <div>
        <label className="mb-1 block text-sm font-medium">Height</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.height ?? 'lg'}
          onChange={(e) =>
            setProp((p: HeroProps) => (p.height = e.target.value as HeroProps['height']))
          }
        >
          <option value="sm">Small (300px)</option>
          <option value="md">Medium (400px)</option>
          <option value="lg">Large (500px)</option>
          <option value="xl">Extra Large (600px)</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Background Color</label>
          <input
            type="color"
            className="h-10 w-full rounded border"
            value={props.backgroundColor ?? '#1f2937'}
            onChange={(e) => setProp((p: HeroProps) => (p.backgroundColor = e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Text Color</label>
          <input
            type="color"
            className="h-10 w-full rounded border"
            value={props.textColor ?? '#ffffff'}
            onChange={(e) => setProp((p: HeroProps) => (p.textColor = e.target.value))}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Overlay Opacity ({props.overlayOpacity ?? 40}%)
        </label>
        <input
          type="range"
          min="0"
          max="100"
          className="w-full"
          value={props.overlayOpacity ?? 40}
          onChange={(e) => setProp((p: HeroProps) => (p.overlayOpacity = Number(e.target.value)))}
        />
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
              onClick={() => setProp((p: HeroProps) => (p.alignment = a))}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

Hero.craft = {
  displayName: 'Hero Banner',
  props: {
    title: 'Welcome to Our Store',
    subtitle: 'Discover amazing products at great prices',
    ctaText: 'Shop Now',
    ctaLink: '/products',
    backgroundImage: '',
    backgroundColor: '#1f2937',
    overlayOpacity: 40,
    height: 'lg' as const,
    alignment: 'center' as const,
    textColor: '#ffffff',
  },
  related: {
    settings: HeroSettings,
  },
};
