'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Trash2, Star } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  title: string | null;
  content: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', filter],
    queryFn: async () => {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await apiClient<{ data: Review[] }>(`/reviews${params}`);
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/reviews/${id}/approve`, { method: 'PUT' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/reviews/${id}/reject`, { method: 'PUT' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/reviews/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Reviews</h1>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                filter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground">No reviews found.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <StarDisplay rating={review.rating} />
                    <StatusBadge status={review.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && <h3 className="mt-2 font-medium">{review.title}</h3>}
                  {review.content && (
                    <p className="mt-1 text-sm text-muted-foreground">{review.content}</p>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Product: {review.productId.slice(0, 8)}… | Customer:{' '}
                    {review.customerId.slice(0, 8)}…
                  </div>
                </div>
                <div className="flex gap-1">
                  {review.status !== 'approved' && (
                    <button
                      onClick={() => approveMutation.mutate(review.id)}
                      className="rounded-md p-2 text-green-600 hover:bg-green-50"
                      title="Approve"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  )}
                  {review.status !== 'rejected' && (
                    <button
                      onClick={() => rejectMutation.mutate(review.id)}
                      className="rounded-md p-2 text-orange-600 hover:bg-orange-50"
                      title="Reject"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this review?')) {
                        deleteMutation.mutate(review.id);
                      }
                    }}
                    className="rounded-md p-2 text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
