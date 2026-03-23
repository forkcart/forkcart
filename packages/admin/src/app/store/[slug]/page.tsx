'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  Star,
  Check,
  Loader2,
  ExternalLink,
  Calendar,
  Package,
  Shield,
  Tag,
  ChevronDown,
  ChevronUp,
  Github,
  Trash2,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface PluginDetail {
  id: string;
  name: string;
  slug: string;
  packageName: string;
  description: string | null;
  shortDescription: string | null;
  author: string | null;
  authorUrl: string | null;
  version: string;
  type: string | null;
  category: string | null;
  icon: string | null;
  screenshots: string[] | null;
  readme: string | null;
  pricing: string;
  price: string | null;
  currency: string;
  downloads: number;
  rating: string | null;
  ratingCount: number;
  tags: string[] | null;
  requirements: Record<string, string> | null;
  repository: string | null;
  license: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  versions?: PluginVersion[];
  reviews?: PluginReview[];
}

interface PluginVersion {
  id: string;
  version: string;
  changelog: string | null;
  minForkcartVersion: string | null;
  size: number | null;
  downloads: number;
  publishedAt: string | null;
  createdAt: string;
}

interface PluginReview {
  id: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  helpful: number;
  createdAt: string;
}

interface InstalledPlugin {
  listingId: string;
  version: string;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const starSize = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${starSize} ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              i <= (hover || value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PluginDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['store-plugin', slug],
    queryFn: () => apiClient<{ data: PluginDetail }>(`/store/${slug}`),
    enabled: !!slug,
  });

  const { data: installedData } = useQuery({
    queryKey: ['store-installed'],
    queryFn: () => apiClient<{ data: InstalledPlugin[] }>('/store/installed'),
  });

  const installMutation = useMutation({
    mutationFn: () => apiClient(`/store/${slug}/install`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-installed'] });
      queryClient.invalidateQueries({ queryKey: ['store-plugin', slug] });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: () => apiClient(`/store/${slug}/uninstall`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-installed'] });
      queryClient.invalidateQueries({ queryKey: ['store-plugin', slug] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      apiClient(`/store/${slug}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, title: reviewTitle, body: reviewBody }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-plugin', slug] });
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewTitle('');
      setReviewBody('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="py-20 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Plugin not found</h3>
        <Link href="/store" className="mt-2 text-sm text-primary hover:underline">
          Back to Store
        </Link>
      </div>
    );
  }

  const plugin = data.data;
  const rating = plugin.rating ? parseFloat(plugin.rating) : 0;
  const installed = (installedData?.data ?? []).some((i) => i.listingId === plugin.id);
  const versions = plugin.versions ?? [];
  const reviews = plugin.reviews ?? [];

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.push('/store')}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Store
      </button>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-muted">
              {plugin.icon ? (
                <img
                  src={plugin.icon}
                  alt={plugin.name}
                  className="h-10 w-10 rounded-xl object-contain"
                />
              ) : (
                <Package className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{plugin.name}</h1>
              <p className="mt-1 text-muted-foreground">
                by{' '}
                {plugin.authorUrl ? (
                  <a
                    href={plugin.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {plugin.author}
                  </a>
                ) : (
                  (plugin.author ?? 'Unknown')
                )}
              </p>
              <div className="mt-2 flex items-center gap-4">
                {plugin.ratingCount > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={rating} size="lg" />
                    <span className="text-sm text-muted-foreground">
                      {rating.toFixed(1)} ({plugin.ratingCount} review
                      {plugin.ratingCount !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Download className="h-4 w-4" /> {plugin.downloads.toLocaleString()} downloads
                </span>
              </div>
            </div>
          </div>

          {/* Screenshots */}
          {plugin.screenshots && plugin.screenshots.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">Screenshots</h2>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {plugin.screenshots.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxImage(url)}
                    className="shrink-0 overflow-hidden rounded-lg border shadow-sm transition-transform hover:scale-[1.02]"
                  >
                    <img
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="h-48 w-auto object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Description</h2>
            <div className="prose prose-sm mt-3 max-w-none text-muted-foreground">
              {plugin.readme ?? plugin.description ?? 'No description available.'}
            </div>
          </div>

          {/* Versions */}
          {versions.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">Changelog</h2>
              <div className="mt-3 space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="rounded-lg border bg-card">
                    <button
                      onClick={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                      className="flex w-full items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-muted px-2 py-0.5 text-sm font-mono font-medium">
                          v{v.version}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {v.publishedAt
                            ? new Date(v.publishedAt).toLocaleDateString()
                            : new Date(v.createdAt).toLocaleDateString()}
                        </span>
                        {v.minForkcartVersion && (
                          <span className="text-xs text-muted-foreground">
                            Requires ForkCart ≥{v.minForkcartVersion}
                          </span>
                        )}
                      </div>
                      {expandedVersion === v.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedVersion === v.id && v.changelog && (
                      <div className="border-t px-4 py-3 text-sm text-muted-foreground">
                        {v.changelog}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Reviews {reviews.length > 0 && `(${reviews.length})`}
              </h2>
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <Star className="h-4 w-4" /> Write Review
              </button>
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div className="mt-4 rounded-lg border bg-card p-5 shadow-sm">
                <h3 className="font-medium">Your Review</h3>
                <div className="mt-3">
                  <StarInput value={reviewRating} onChange={setReviewRating} />
                </div>
                <input
                  placeholder="Review title (optional)"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="mt-3 h-10 w-full rounded-md border px-3 text-sm"
                />
                <textarea
                  placeholder="Tell others what you think..."
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-md border p-3 text-sm"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setShowReviewForm(false)}
                    className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate()}
                    disabled={reviewRating === 0 || reviewMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            )}

            {/* Review List */}
            <div className="mt-4 space-y-3">
              {reviews.length === 0 && !showReviewForm && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No reviews yet. Be the first!
                </p>
              )}
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} />
                      {review.title && <span className="font-medium">{review.title}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.body && (
                    <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                  )}
                  {review.isVerifiedPurchase && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-green-600">
                      <Check className="h-3 w-3" /> Verified Install
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0">
          <div className="sticky top-8 space-y-4">
            {/* Install Card */}
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              {plugin.pricing === 'paid' && plugin.price && (
                <p className="mb-3 text-2xl font-bold">
                  €{(parseFloat(plugin.price) / 100).toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground"> / license</span>
                </p>
              )}

              {installed ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md border bg-green-50 p-3 text-sm font-medium text-green-700">
                    <Check className="h-4 w-4" /> Installed
                  </div>
                  <button
                    onClick={() => uninstallMutation.mutate()}
                    disabled={uninstallMutation.isPending}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {uninstallMutation.isPending ? 'Removing...' : 'Uninstall'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => installMutation.mutate()}
                  disabled={installMutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {installMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {installMutation.isPending ? 'Installing...' : 'Install Plugin'}
                </button>
              )}
            </div>

            {/* Info Card */}
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <h3 className="font-semibold">Details</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> Version
                  </dt>
                  <dd className="font-mono">{plugin.version}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Download className="h-3.5 w-3.5" /> Downloads
                  </dt>
                  <dd>{plugin.downloads.toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Updated
                  </dt>
                  <dd>{new Date(plugin.updatedAt).toLocaleDateString()}</dd>
                </div>
                {plugin.license && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" /> License
                    </dt>
                    <dd>{plugin.license}</dd>
                  </div>
                )}
                {plugin.type && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" /> Type
                    </dt>
                    <dd className="capitalize">{plugin.type}</dd>
                  </div>
                )}
              </dl>

              {plugin.repository && (
                <a
                  href={plugin.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                >
                  <Github className="h-4 w-4" /> View Source
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Tags */}
            {plugin.tags && plugin.tags.length > 0 && (
              <div className="rounded-lg border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Tags</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plugin.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/store?search=${encodeURIComponent(tag)}`}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Screenshot"
            className="max-h-[90vh] max-w-[90vw] rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
