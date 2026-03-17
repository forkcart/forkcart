import { StorefrontSlot } from '@/components/plugins/StorefrontSlot';

/**
 * Server component wrapper for cart page plugin slots.
 * Slots are rendered server-side and hydrated on client.
 */
export function CartPageSlots({ position }: { position: 'top' | 'bottom' }) {
  const slotName = position === 'top' ? 'cart-page-top' : 'cart-page-bottom';
  return <StorefrontSlot slotName={slotName} currentPage="cart" />;
}
