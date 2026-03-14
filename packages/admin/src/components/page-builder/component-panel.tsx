'use client';

import { useEditor, Element } from '@craftjs/core';
import {
  Type,
  Heading as HeadingIcon,
  Image,
  MousePointer2,
  LayoutTemplate,
  Columns as ColumnsIcon,
  ArrowDownUp,
  Sparkles,
  Grid3X3,
  FolderTree,
  Star,
  Mail,
  Quote,
  HelpCircle,
  Play,
  Minus,
  LayoutGrid,
  MessageSquare,
  MapPin,
  Share2,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container } from './blocks/container';
import { Heading } from './blocks/heading';
import { TextBlock } from './blocks/text-block';
import { ImageBlock } from './blocks/image-block';
import { ButtonBlock } from './blocks/button-block';
import { Hero } from './blocks/hero';
import { Columns } from './blocks/columns';
import { Spacer } from './blocks/spacer';
import { ProductGrid } from './blocks/product-grid';
import { CategoryGrid } from './blocks/category-grid';
import { FeaturedProduct } from './blocks/featured-product';
import { Newsletter } from './blocks/newsletter';
import { Testimonials } from './blocks/testimonials';
import { Faq } from './blocks/faq';
import { VideoEmbed } from './blocks/video-embed';
import { Divider } from './blocks/divider';
import { IconGrid } from './blocks/icon-grid';
import { ContactForm } from './blocks/contact-form';
import { MapEmbed } from './blocks/map-embed';
import { SocialLinks } from './blocks/social-links';
import { Banner } from './blocks/banner';

interface BlockDefinition {
  label: string;
  icon: React.ReactNode;
  category: 'layout' | 'content' | 'commerce';
  create: () => React.ReactElement;
}

const blocks: BlockDefinition[] = [
  // Commerce
  {
    label: 'Hero Banner',
    icon: <Sparkles className="h-5 w-5" />,
    category: 'commerce',
    create: () => <Hero />,
  },
  {
    label: 'Product Grid',
    icon: <Grid3X3 className="h-5 w-5" />,
    category: 'commerce',
    create: () => <ProductGrid />,
  },
  {
    label: 'Categories',
    icon: <FolderTree className="h-5 w-5" />,
    category: 'commerce',
    create: () => <CategoryGrid />,
  },
  {
    label: 'Featured',
    icon: <Star className="h-5 w-5" />,
    category: 'commerce',
    create: () => <FeaturedProduct />,
  },
  {
    label: 'Newsletter',
    icon: <Mail className="h-5 w-5" />,
    category: 'commerce',
    create: () => <Newsletter />,
  },
  {
    label: 'Testimonials',
    icon: <Quote className="h-5 w-5" />,
    category: 'commerce',
    create: () => <Testimonials />,
  },
  {
    label: 'Banner',
    icon: <Megaphone className="h-5 w-5" />,
    category: 'commerce',
    create: () => <Banner />,
  },
  // Layout
  {
    label: 'Container',
    icon: <LayoutTemplate className="h-5 w-5" />,
    category: 'layout',
    create: () => <Element is={Container} canvas />,
  },
  {
    label: 'Columns',
    icon: <ColumnsIcon className="h-5 w-5" />,
    category: 'layout',
    create: () => <Columns />,
  },
  {
    label: 'Spacer',
    icon: <ArrowDownUp className="h-5 w-5" />,
    category: 'layout',
    create: () => <Spacer />,
  },
  {
    label: 'Divider',
    icon: <Minus className="h-5 w-5" />,
    category: 'layout',
    create: () => <Divider />,
  },
  // Content
  {
    label: 'Heading',
    icon: <HeadingIcon className="h-5 w-5" />,
    category: 'content',
    create: () => <Heading />,
  },
  {
    label: 'Text',
    icon: <Type className="h-5 w-5" />,
    category: 'content',
    create: () => <TextBlock />,
  },
  {
    label: 'Image',
    icon: <Image className="h-5 w-5" />,
    category: 'content',
    create: () => <ImageBlock />,
  },
  {
    label: 'Button',
    icon: <MousePointer2 className="h-5 w-5" />,
    category: 'content',
    create: () => <ButtonBlock />,
  },
  {
    label: 'Video',
    icon: <Play className="h-5 w-5" />,
    category: 'content',
    create: () => <VideoEmbed />,
  },
  {
    label: 'FAQ',
    icon: <HelpCircle className="h-5 w-5" />,
    category: 'content',
    create: () => <Faq />,
  },
  {
    label: 'Icon Grid',
    icon: <LayoutGrid className="h-5 w-5" />,
    category: 'content',
    create: () => <IconGrid />,
  },
  {
    label: 'Contact Form',
    icon: <MessageSquare className="h-5 w-5" />,
    category: 'content',
    create: () => <ContactForm />,
  },
  {
    label: 'Map',
    icon: <MapPin className="h-5 w-5" />,
    category: 'content',
    create: () => <MapEmbed />,
  },
  {
    label: 'Social Links',
    icon: <Share2 className="h-5 w-5" />,
    category: 'content',
    create: () => <SocialLinks />,
  },
];

const categoryLabels: Record<string, string> = {
  commerce: 'Commerce',
  layout: 'Layout',
  content: 'Content',
};

export function ComponentPanel() {
  const { connectors } = useEditor();

  const grouped = blocks.reduce(
    (acc, block) => {
      if (!acc[block.category]) acc[block.category] = [];
      acc[block.category]!.push(block);
      return acc;
    },
    {} as Record<string, BlockDefinition[]>,
  );

  return (
    <div className="w-60 overflow-y-auto border-r bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Blocks</h3>
      {(['commerce', 'layout', 'content'] as const).map((category) => (
        <div key={category} className="mb-6">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            {categoryLabels[category]}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {(grouped[category] ?? []).map((block) => (
              <div
                key={block.label}
                ref={(ref) => {
                  if (ref) connectors.create(ref, block.create());
                }}
                className={cn(
                  'flex cursor-grab flex-col items-center gap-1 rounded-lg border border-gray-200 p-3',
                  'transition-colors hover:border-blue-300 hover:bg-blue-50',
                  'active:cursor-grabbing',
                )}
              >
                <span className="text-gray-600">{block.icon}</span>
                <span className="text-center text-xs font-medium text-gray-700">{block.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
