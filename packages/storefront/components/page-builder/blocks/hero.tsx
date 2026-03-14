import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { localePath } from '@/lib/navigation';

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
  locale?: string;
}

const heightClasses: Record<string, string> = {
  sm: 'min-h-[300px]',
  md: 'min-h-[400px]',
  lg: 'min-h-[500px]',
  xl: 'min-h-[600px]',
};

export function RenderHero({
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
  locale,
}: HeroProps) {
  return (
    <section
      className={cn(
        'relative flex w-full items-center overflow-hidden',
        heightClasses[height] ?? heightClasses.lg,
        className,
      )}
      style={{ backgroundColor }}
    >
      {backgroundImage && (
        <>
          <Image
            src={backgroundImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity / 100 }} />
        </>
      )}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6" style={{ textAlign: alignment }}>
        <h1
          className="mb-4 text-4xl font-bold md:text-5xl lg:text-6xl"
          style={{ color: textColor }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mb-8 text-lg md:text-xl" style={{ color: textColor, opacity: 0.9 }}>
            {subtitle}
          </p>
        )}
        {ctaText && ctaLink && (
          <Link
            href={localePath(ctaLink, locale ?? 'en')}
            className="inline-block rounded-lg bg-white px-8 py-3 text-lg font-semibold text-gray-900 transition-colors hover:bg-gray-100"
          >
            {ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}
