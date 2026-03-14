'use client';

import { Editor, Frame, Element } from '@craftjs/core';
import { ComponentPanel } from './component-panel';
import { SettingsPanel } from './settings-panel';
import { Toolbar } from './toolbar';
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

/** All block components registered with Craft.js */
const resolver = {
  Container,
  Heading,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  Hero,
  Columns,
  Spacer,
  ProductGrid,
  CategoryGrid,
  FeaturedProduct,
  Newsletter,
  Testimonials,
  Faq,
  VideoEmbed,
  Divider,
  IconGrid,
  ContactForm,
  MapEmbed,
  SocialLinks,
  Banner,
};

interface PageBuilderEditorProps {
  /** Serialized Craft.js JSON to load (null for new page) */
  initialContent?: string | null;
  /** Called when user clicks Save */
  onSave: (content: string) => void;
  /** Called when user clicks Publish */
  onPublish?: () => void;
  /** Called when user clicks Preview */
  onPreview?: () => void;
  /** Page title shown in toolbar */
  pageTitle?: string;
  /** Whether save is in progress */
  saving?: boolean;
}

export function PageBuilderEditor({
  initialContent,
  onSave,
  onPublish,
  onPreview,
  pageTitle,
  saving,
}: PageBuilderEditorProps) {
  return (
    <div className="flex h-full flex-col">
      <Editor resolver={resolver} enabled>
        <Toolbar
          onSave={onSave}
          onPublish={onPublish}
          onPreview={onPreview}
          pageTitle={pageTitle}
          saving={saving}
        />
        <div className="flex flex-1 overflow-hidden">
          <ComponentPanel />
          <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
            <div className="mx-auto min-h-[600px] bg-white shadow-sm">
              <Frame data={initialContent ?? undefined}>
                <Element is={Container} canvas paddingX={0} paddingY={0} maxWidth="full">
                  <Hero />
                </Element>
              </Frame>
            </div>
          </div>
          <SettingsPanel />
        </div>
      </Editor>
    </div>
  );
}

export { resolver };
