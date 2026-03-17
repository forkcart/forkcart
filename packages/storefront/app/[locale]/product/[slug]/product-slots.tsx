import { StorefrontSlot } from '@/components/plugins/StorefrontSlot';

/**
 * Server component wrapper for product page plugin slots.
 */
export function ProductPageSlots({ position }: { position: 'top' | 'bottom' | 'sidebar' }) {
  const slotMap = {
    top: 'product-page-top',
    bottom: 'product-page-bottom',
    sidebar: 'product-page-sidebar',
  } as const;

  return <StorefrontSlot slotName={slotMap[position]} currentPage="product" />;
}
