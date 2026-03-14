import { cn } from '@/lib/utils';

interface VideoEmbedProps {
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
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch?.[1]) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch?.[1]) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

export function RenderVideoEmbed({
  url,
  aspectRatio = '16:9',
  maxWidth = 'lg',
  className,
}: VideoEmbedProps) {
  const embedUrl = url ? getEmbedUrl(url) : null;
  if (!embedUrl) return null;

  return (
    <div
      className={cn(
        'mx-auto w-full px-6 py-8',
        maxWidthClasses[maxWidth] ?? maxWidthClasses.lg,
        className,
      )}
    >
      <div
        className={cn(
          'w-full overflow-hidden rounded-lg',
          aspectClasses[aspectRatio] ?? aspectClasses['16:9'],
        )}
      >
        <iframe
          src={embedUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />
      </div>
    </div>
  );
}
