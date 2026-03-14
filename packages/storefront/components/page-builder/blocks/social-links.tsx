import { cn } from '@/lib/utils';

interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

interface SocialLinksProps {
  links?: SocialLink[];
  size?: 'sm' | 'md' | 'lg';
  alignment?: 'left' | 'center' | 'right';
  color?: string;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-lg',
  lg: 'h-12 w-12 text-xl',
};

export function RenderSocialLinks({
  links = [],
  size = 'md',
  alignment = 'center',
  color = '#374151',
  className,
}: SocialLinksProps) {
  if (!links.length) return null;

  return (
    <div className={cn('w-full px-6 py-8', className)} style={{ textAlign: alignment }}>
      <div className="inline-flex gap-3">
        {links.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center justify-center rounded-full border transition-colors hover:bg-gray-100',
              sizeClasses[size] ?? sizeClasses.md,
            )}
            style={{ color }}
            title={link.platform}
          >
            {link.icon}
          </a>
        ))}
      </div>
    </div>
  );
}
