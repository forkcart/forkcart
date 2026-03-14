'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

interface WishlistButtonProps {
  productId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function WishlistButton({ productId, size = 'sm', className = '' }: WishlistButtonProps) {
  const { token, customer } = useAuth();
  const [isWished, setIsWished] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !customer) return;
    // Check if product is in wishlist by fetching the list
    fetch(`${API_URL}/api/v1/public/wishlists`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ data: Array<{ productId: string }> }>) : null))
      .then((data) => {
        if (data?.data) {
          setIsWished(data.data.some((item) => item.productId === productId));
        }
      })
      .catch((error: unknown) => {
        console.error('[WishlistButton] Failed to check wishlist status:', error);
      });
  }, [token, customer, productId]);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/public/wishlists/${productId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = (await res.json()) as { data: { added: boolean } };
          setIsWished(data.data.added);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [token, productId],
  );

  if (!customer) return null;

  const iconSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const btnSize = size === 'sm' ? 'p-1.5' : 'p-2';

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-full bg-white/80 backdrop-blur-sm transition hover:bg-white ${btnSize} ${className}`}
      aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <svg
        className={`${iconSize} transition ${isWished ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
        fill={isWished ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}
