'use client';

import {
  useProductData,
  RenderProductImages,
  RenderProductTitle,
  RenderProductPrice,
  RenderAddToCart,
  RenderProductDescription,
  RenderProductShortDesc,
  RenderProductReviews,
  RenderRelatedProducts,
} from './product-page-renderer';

type BlockType =
  | 'images'
  | 'title'
  | 'price'
  | 'addToCart'
  | 'description'
  | 'shortDesc'
  | 'reviews'
  | 'related';

/**
 * Renders a product sub-block. If we're inside a ProductDataProvider
 * (i.e., on a real product page), renders the actual component.
 * Otherwise renders a placeholder (e.g., in /p/product preview).
 */
export function ProductBlockSlot({
  block,
  props,
}: {
  block: BlockType;
  props: Record<string, unknown>;
}) {
  const product = useProductData();

  if (!product) {
    // Not in product context — show placeholder text
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-center text-sm text-gray-400">
        {block === 'images' && '📸 Product Images'}
        {block === 'title' && '📝 Product Title'}
        {block === 'price' && '💰 Product Price'}
        {block === 'addToCart' && '🛒 Add to Cart'}
        {block === 'description' && '📄 Product Description'}
        {block === 'shortDesc' && '💬 Short Description'}
        {block === 'reviews' && '⭐ Product Reviews'}
        {block === 'related' && '📦 Related Products'}
      </div>
    );
  }

  switch (block) {
    case 'images':
      return <RenderProductImages layout={props.layout as string} />;
    case 'title':
      return (
        <RenderProductTitle
          showSku={props.showSku as boolean}
          showWishlist={props.showWishlist as boolean}
          titleSize={props.titleSize as string}
        />
      );
    case 'price':
      return (
        <RenderProductPrice
          showComparePrice={props.showComparePrice as boolean}
          showStock={props.showStock as boolean}
        />
      );
    case 'addToCart':
      return <RenderAddToCart />;
    case 'description':
      return (
        <RenderProductDescription
          showHeading={props.showHeading as boolean}
          headingText={props.headingText as string}
        />
      );
    case 'shortDesc':
      return <RenderProductShortDesc />;
    case 'reviews':
      return <RenderProductReviews />;
    case 'related':
      return (
        <RenderRelatedProducts
          columns={props.columns as number}
          limit={props.limit as number}
          title={props.title as string}
        />
      );
    default:
      return null;
  }
}
