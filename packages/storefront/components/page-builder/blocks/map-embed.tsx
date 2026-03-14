import { cn } from '@/lib/utils';

interface MapEmbedProps {
  query?: string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function RenderMapEmbed({
  query = 'New York, NY',
  height = 400,
  borderRadius = 12,
  className,
}: MapEmbedProps) {
  return (
    <div className={cn('w-full px-6 py-8', className)}>
      <iframe
        src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
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
}
