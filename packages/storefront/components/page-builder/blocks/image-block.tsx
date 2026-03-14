import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
