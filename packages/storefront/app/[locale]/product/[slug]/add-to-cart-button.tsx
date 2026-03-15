'use client';

import { useState } from 'react';
import { ShoppingBag, Check, Minus, Plus } from 'lucide-react';
import { useCart } from '@/components/cart/cart-provider';
import { useTranslation } from '@forkcart/i18n/react';

interface Props {
  product: { id: string; name: string; slug: string; price: number };
  variantId?: string;
  disabled?: boolean;
}

export function AddToCartButton({ product, variantId, disabled }: Props) {
  const { addItem } = useCart();
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product, quantity, variantId);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center rounded-lg border">
        <button
          type="button"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="flex h-11 w-11 items-center justify-center text-gray-500 hover:text-gray-900"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-10 text-center text-sm font-medium">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity(quantity + 1)}
          className="flex h-11 w-11 items-center justify-center text-gray-500 hover:text-gray-900"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={handleAdd}
        disabled={disabled || added}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {added ? (
          <>
            <Check className="h-4 w-4" />
            {t('product.added')}
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" />
            {t('product.addToCart')}
          </>
        )}
      </button>
    </div>
  );
}
