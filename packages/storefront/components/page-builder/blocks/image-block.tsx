import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { localePath } from '@/lib/navigation';

export interface ImageBlockProps {
  src?: string;
  alt?: string;
  aspectRatio?: 'auto' | '1:1' | '16:9' | '4:3' | '3:2';
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
  link?: string;
  className?: string;
  locale?: string;
}

const aspectRatioClasses: Record<string, string> = {
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '3:2': 'aspect-[3/2]',
};

export function RenderImageBlock({
  src,
  alt = '',
  aspectRatio = 'auto',
  objectFit = 'cover',
  borderRadius = 0,
  link,
  className,
  locale,
}: ImageBlockProps) {
  if (!src) return null;

  const radiusStyle = borderRadius > 0 ? { borderRadius } : undefined;

  const content =
    aspectRatio === 'auto' ? (
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={800}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
        className={cn('h-auto w-full', className)}
        style={{ objectFit, ...radiusStyle }}
      />
    ) : (
      <div
        className={cn(
          'relative w-full overflow-hidden',
          aspectRatioClasses[aspectRatio],
          className,
        )}
        style={radiusStyle}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          style={{ objectFit }}
        />
      </div>
    );

  const wrapped = link ? (
    <Link href={localePath(link, locale ?? 'en')} className="block">
      {content}
    </Link>
  ) : (
    content
  );

  return <div className="mx-auto w-full max-w-6xl px-6">{wrapped}</div>;
}
