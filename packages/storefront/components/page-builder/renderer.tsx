import { Suspense } from 'react';
import { stylesToCSS, type BlockStyles } from './shared/block-styles';
import { RenderContainer } from './blocks/container';
import { RenderHeading } from './blocks/heading';
import { RenderTextBlock } from './blocks/text-block';
import { RenderImageBlock } from './blocks/image-block';
import { ProductBlockSlot } from './product-block-slot';
import { RenderButtonBlock } from './blocks/button-block';
import { RenderHero } from './blocks/hero';
import { RenderSpacer } from './blocks/spacer';
import { RenderColumns } from './blocks/columns';
import { RenderProductGrid } from './blocks/product-grid';
import { RenderCategoryGrid } from './blocks/category-grid';
import { RenderFeaturedProduct } from './blocks/featured-product';
import { RenderNewsletter } from './blocks/newsletter';
import { RenderTestimonials } from './blocks/testimonials';
import { RenderFaq } from './blocks/faq';
import { RenderVideoEmbed } from './blocks/video-embed';
import { RenderDivider } from './blocks/divider';
import { RenderIconGrid } from './blocks/icon-grid';
import { RenderContactForm } from './blocks/contact-form';
import { RenderMapEmbed } from './blocks/map-embed';
import { RenderSocialLinks } from './blocks/social-links';
import { RenderBanner } from './blocks/banner';

/**
 * Craft.js serialized node shape
 */
interface CraftNode {
  type: { resolvedName: string } | string;
  props: Record<string, unknown>;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
  isCanvas?: boolean;
  parent?: string;
  displayName?: string;
  custom?: Record<string, unknown>;
  hidden?: boolean;
}

type CraftData = Record<string, CraftNode>;

/**
 * Extracts the resolved component name from a Craft.js node type.
 */
function getResolvedName(node: CraftNode): string {
  if (typeof node.type === 'string') return node.type;
  if (node.type && typeof node.type === 'object' && 'resolvedName' in node.type) {
    return node.type.resolvedName;
  }
  return 'Unknown';
}

/**
 * Recursively renders children node IDs.
 */
function renderChildren(data: CraftData, childIds: string[], locale?: string): React.ReactNode {
  return childIds.map((id) => <RenderNode key={id} data={data} nodeId={id} locale={locale} />);
}

/**
 * Renders a single Craft.js node and its children.
 * Server-compatible — no Craft.js runtime needed.
 */
function RenderNode({
  data,
  nodeId,
  locale,
}: {
  data: CraftData;
  nodeId: string;
  locale?: string;
}) {
  const node = data[nodeId];
  if (!node || node.hidden) return null;

  const name = getResolvedName(node);
  const props = node.props ?? {};

  // Collect all children: direct nodes + linked nodes (used by Columns)
  const childIds = node.nodes ?? [];
  const linkedNodeIds = node.linkedNodes ? Object.values(node.linkedNodes) : [];
  const allChildIds = [...childIds, ...linkedNodeIds];
  const children = allChildIds.length > 0 ? renderChildren(data, allChildIds, locale) : undefined;

  // Apply user-defined block styles if present
  const blockStyles = props.styles as BlockStyles | undefined;
  const styleCSS = blockStyles ? stylesToCSS(blockStyles) : undefined;
  const hasStyles =
    styleCSS && Object.values(styleCSS).some((v) => v !== undefined && v !== 0 && v !== '');

  const rendered = (() => {
    switch (name) {
      case 'Container':
        return (
          <RenderContainer {...(props as Record<string, unknown>)}>{children}</RenderContainer>
        );

      case 'Heading':
        return <RenderHeading {...(props as Record<string, unknown>)} />;

      case 'TextBlock':
      case 'Text':
        return <RenderTextBlock {...(props as Record<string, unknown>)} />;

      case 'ImageBlock':
      case 'Image':
        return <RenderImageBlock {...(props as Record<string, unknown>)} locale={locale} />;

      case 'ButtonBlock':
      case 'Button':
        return <RenderButtonBlock {...(props as Record<string, unknown>)} locale={locale} />;

      case 'Hero':
        return <RenderHero {...(props as Record<string, unknown>)} locale={locale} />;

      case 'Spacer':
        return <RenderSpacer {...(props as Record<string, unknown>)} />;

      case 'Columns':
        return <RenderColumns {...(props as Record<string, unknown>)}>{children}</RenderColumns>;

      case 'ProductGrid':
        return (
          <Suspense
            fallback={
              <div className="grid animate-pulse grid-cols-4 gap-6">
                {Array.from({ length: (props.limit as number) ?? 4 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-gray-100" />
                ))}
              </div>
            }
          >
            <RenderProductGrid {...(props as Record<string, unknown>)} />
          </Suspense>
        );

      case 'CategoryGrid':
        return (
          <Suspense
            fallback={
              <div className="grid animate-pulse grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-xl bg-gray-100" />
                ))}
              </div>
            }
          >
            <RenderCategoryGrid {...(props as Record<string, unknown>)} locale={locale} />
          </Suspense>
        );

      case 'FeaturedProduct':
        return (
          <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-gray-100" />}>
            <RenderFeaturedProduct {...(props as Record<string, unknown>)} locale={locale} />
          </Suspense>
        );

      case 'Newsletter':
        return <RenderNewsletter {...(props as Record<string, unknown>)} />;

      case 'Testimonials':
        return <RenderTestimonials {...(props as Record<string, unknown>)} />;

      case 'Faq':
        return <RenderFaq {...(props as Record<string, unknown>)} />;

      case 'VideoEmbed':
        return <RenderVideoEmbed {...(props as Record<string, unknown>)} />;

      case 'Divider':
        return <RenderDivider {...(props as Record<string, unknown>)} />;

      case 'IconGrid':
        return <RenderIconGrid {...(props as Record<string, unknown>)} />;

      case 'ContactForm':
        return <RenderContactForm {...(props as Record<string, unknown>)} />;

      case 'MapEmbed':
        return <RenderMapEmbed {...(props as Record<string, unknown>)} />;

      case 'SocialLinks':
        return <RenderSocialLinks {...(props as Record<string, unknown>)} />;

      case 'Banner':
        return <RenderBanner {...(props as Record<string, unknown>)} locale={locale} />;

      // Dynamic shop blocks — render a slot marker that routes pick up
      case 'DynamicProductDetail':
        return <div data-dynamic-block="product-detail" />;
      // Product sub-blocks — render real product components when in product context
      case 'ProductImagesBlock':
        return <ProductBlockSlot block="images" props={props} />;
      case 'ProductTitleBlock':
        return <ProductBlockSlot block="title" props={props} />;
      case 'ProductPriceBlock':
        return <ProductBlockSlot block="price" props={props} />;
      case 'AddToCartBlock':
        return <ProductBlockSlot block="addToCart" props={props} />;
      case 'ProductDescriptionBlock':
        return <ProductBlockSlot block="description" props={props} />;
      case 'ProductShortDescBlock':
        return <ProductBlockSlot block="shortDesc" props={props} />;
      case 'ProductReviewsBlock':
        return <ProductBlockSlot block="reviews" props={props} />;
      case 'RelatedProductsBlock':
        return <ProductBlockSlot block="related" props={props} />;
      case 'DynamicCart':
        return <div data-dynamic-block="cart" />;
      case 'DynamicCheckout':
        return <div data-dynamic-block="checkout" />;
      case 'DynamicAccount':
        return <div data-dynamic-block="account" />;
      case 'DynamicSearch':
        return <div data-dynamic-block="search" />;

      // Fallback for unknown blocks: just render children if any
      default:
        if (children) return <div>{children}</div>;
        return null;
    }
  })();

  // Wrap with style div if block has custom styles
  // Container applies styles internally, so skip wrapping it
  if (hasStyles && name !== 'Container') {
    return <div style={styleCSS}>{rendered}</div>;
  }
  return rendered;
}

/**
 * Page Builder Renderer
 *
 * Takes Craft.js serialized JSON and renders it as pure HTML/React.
 * No Craft.js runtime required — fully server-side renderable.
 */
export function PageRenderer({ content, locale }: { content: unknown; locale?: string }) {
  if (!content || typeof content !== 'object') return null;

  const data = content as CraftData;
  const root = data['ROOT'];
  if (!root) return null;

  const childIds = root.nodes ?? [];
  const linkedNodeIds = root.linkedNodes ? Object.values(root.linkedNodes) : [];
  const allChildIds = [...childIds, ...linkedNodeIds];

  // Render ROOT's own props (Container-like) wrapping its children
  const rootProps = root.props ?? {};
  const rootName = getResolvedName(root);

  // If ROOT is itself a Container, render with its props
  if (rootName === 'Container' || rootName === 'div') {
    return (
      <RenderContainer {...(rootProps as Record<string, unknown>)}>
        {renderChildren(data, allChildIds, locale)}
      </RenderContainer>
    );
  }

  // Otherwise just render children directly
  return <>{renderChildren(data, allChildIds, locale)}</>;
}
