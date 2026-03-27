export { Container, type ContainerProps } from './container';
export { Heading, type HeadingProps } from './heading';
export { TextBlock, type TextBlockProps } from './text-block';
export { ImageBlock, type ImageBlockProps } from './image-block';
export { ButtonBlock, type ButtonBlockProps } from './button-block';
export { Hero, type HeroProps } from './hero';
export { Columns, type ColumnsProps } from './columns';
export { Spacer, type SpacerProps } from './spacer';
export { ProductGrid, type ProductGridProps } from './product-grid';
export { CategoryGrid, type CategoryGridProps } from './category-grid';
export { FeaturedProduct, type FeaturedProductProps } from './featured-product';
export { Newsletter, type NewsletterProps } from './newsletter';
export { Testimonials, type TestimonialsProps } from './testimonials';
export { Faq, type FaqProps } from './faq';
export { VideoEmbed, type VideoEmbedProps } from './video-embed';
export { Divider, type DividerProps } from './divider';
export { IconGrid, type IconGridProps } from './icon-grid';
export { ContactForm, type ContactFormProps } from './contact-form';
export { MapEmbed, type MapEmbedProps } from './map-embed';
export { SocialLinks, type SocialLinksProps } from './social-links';
export { Banner, type BannerProps } from './banner';

// Dynamic blocks — render real shop functionality on the storefront
export { DynamicProductDetail, type DynamicProductDetailProps } from './dynamic-product-detail';
export { DynamicCart, type DynamicCartProps } from './dynamic-cart';
export { DynamicCheckout } from './dynamic-checkout';
export { DynamicAccount } from './dynamic-account';
export { DynamicSearch } from './dynamic-search';

// Plugin blocks — rendered from plugin pageBuilderBlocks
export { PluginBlock, type PluginBlockProps } from './plugin-block';

// Product page sub-blocks — individual editable product elements
export {
  ProductImagesBlock,
  type ProductImagesBlockProps,
  ProductTitleBlock,
  type ProductTitleBlockProps,
  ProductPriceBlock,
  type ProductPriceBlockProps,
  AddToCartBlock,
  type AddToCartBlockProps,
  ProductDescriptionBlock,
  type ProductDescriptionBlockProps,
  ProductReviewsBlock,
  type ProductReviewsBlockProps,
  RelatedProductsBlock,
  type RelatedProductsBlockProps,
  ProductShortDescBlock,
} from './product-blocks';
