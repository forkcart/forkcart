'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useTranslation } from '@forkcart/i18n/react';
import { StarRating } from './star-rating';
import { API_URL } from '@/lib/config';

interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  title: string | null;
  content: string | null;
  status: string;
  createdAt: string;
}

interface ReviewData {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { t } = useTranslation();
  const { token, customer } = useAuth();
  const [data, setData] = useState<ReviewData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/public/products/${productId}/reviews`);
      if (res.ok) {
        const json = (await res.json()) as { data: ReviewData };
        setData(json.data);
      }
    } catch {
      // ignore
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || rating === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/public/products/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, title: title || undefined, content: content || undefined }),
      });
      if (res.ok) {
        setSubmitted(true);
        setShowForm(false);
        setRating(0);
        setTitle('');
        setContent('');
        // Reviews need approval, so don't refresh immediately
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t pt-8 mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
          {t('product.reviews')}
        </h2>
        {data && data.reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={data.averageRating} size="sm" />
            <span className="text-sm text-gray-500">
              {data.averageRating.toFixed(1)} ({data.reviewCount})
            </span>
          </div>
        )}
      </div>

      {/* Review list */}
      <div className="mt-6 space-y-6">
        {data?.reviews.map((review) => (
          <div key={review.id} className="border-b pb-6 last:border-b-0">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-xs text-gray-400">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
            {review.title && (
              <h3 className="mt-1 text-sm font-medium text-gray-900">{review.title}</h3>
            )}
            {review.content && <p className="mt-1 text-sm text-gray-600">{review.content}</p>}
          </div>
        ))}
        {data && data.reviews.length === 0 && !submitted && (
          <p className="text-sm text-gray-400">{t('reviews.noReviews')}</p>
        )}
      </div>

      {/* Submit review */}
      {submitted && <p className="mt-4 text-sm text-green-600">{t('reviews.submitted')}</p>}

      {customer && !showForm && !submitted && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-6 text-sm font-medium text-accent hover:underline"
        >
          {t('reviews.writeReview')}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg bg-gray-50 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('reviews.rating')}
            </label>
            <StarRating rating={rating} size="lg" interactive onChange={setRating} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('reviews.titleLabel')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder={t('reviews.titlePlaceholder')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('reviews.contentLabel')}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder={t('reviews.contentPlaceholder')}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? t('common.loading') : t('reviews.submit')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
