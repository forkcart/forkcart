'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2, RefreshCw, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { sanitizeHtml } from '@/lib/sanitize';

interface AIStatusResponse {
  data: {
    configured: boolean;
    provider: string | null;
  };
}

interface AIDescriptionResponse {
  data: { description: string };
}

interface AISEOResponse {
  data: { title: string; description: string; keywords: string[] };
}

interface ProductAIButtonsProps {
  productId: string;
  onDescriptionGenerated: (description: string) => void;
  onSEOGenerated: (seo: { title: string; description: string; keywords: string[] }) => void;
  currentDescription?: string;
}

/** AI generation buttons for the product edit page */
export function ProductAIButtons({
  productId,
  onDescriptionGenerated,
  onSEOGenerated,
  currentDescription,
}: ProductAIButtonsProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'description' | 'seo' | null>(null);

  const { data: status } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => apiClient<AIStatusResponse>('/ai/status'),
  });

  const isConfigured = status?.data?.configured ?? false;

  const descriptionMutation = useMutation({
    mutationFn: () =>
      apiClient<AIDescriptionResponse>(`/ai/products/${productId}/description`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      setPreview(data.data.description);
      setPreviewType('description');
    },
  });

  const improveMutation = useMutation({
    mutationFn: () =>
      apiClient<AIDescriptionResponse>(`/ai/products/${productId}/improve`, {
        method: 'POST',
        body: JSON.stringify({ currentDescription }),
      }),
    onSuccess: (data) => {
      setPreview(data.data.description);
      setPreviewType('description');
    },
  });

  const seoMutation = useMutation({
    mutationFn: () => apiClient<AISEOResponse>(`/ai/products/${productId}/seo`, { method: 'POST' }),
    onSuccess: (data) => {
      setPreview(JSON.stringify(data.data, null, 2));
      setPreviewType('seo');
    },
  });

  const isLoading =
    descriptionMutation.isPending || improveMutation.isPending || seoMutation.isPending;

  const disabledTitle = isConfigured ? undefined : 'Configure AI provider in Settings → AI';

  function handleAccept() {
    if (previewType === 'description' && preview) {
      onDescriptionGenerated(preview);
    } else if (previewType === 'seo') {
      try {
        const seo = JSON.parse(preview ?? '{}') as {
          title: string;
          description: string;
          keywords: string[];
        };
        onSEOGenerated(seo);
      } catch {
        // ignore parse error
      }
    }
    setPreview(null);
    setPreviewType(null);
  }

  function handleRegenerate() {
    if (previewType === 'description') {
      if (currentDescription) {
        improveMutation.mutate();
      } else {
        descriptionMutation.mutate();
      }
    } else if (previewType === 'seo') {
      seoMutation.mutate();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            currentDescription ? improveMutation.mutate() : descriptionMutation.mutate()
          }
          disabled={!isConfigured || isLoading}
          title={disabledTitle}
          className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {descriptionMutation.isPending || improveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {currentDescription ? 'Improve Description' : 'Generate Description'}
        </button>

        <button
          type="button"
          onClick={() => seoMutation.mutate()}
          disabled={!isConfigured || isLoading}
          title={disabledTitle}
          className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {seoMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Generate SEO
        </button>
      </div>

      {/* Preview panel */}
      {preview && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-purple-800">
              {previewType === 'description' ? '✨ AI Description Preview' : '✨ AI SEO Preview'}
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-purple-600 hover:bg-purple-100"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700"
              >
                <Check className="h-3 w-3" />
                Apply
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setPreviewType(null);
                }}
                className="rounded px-2 py-1 text-xs text-purple-600 hover:bg-purple-100"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="mt-3 max-h-60 overflow-y-auto text-sm text-purple-900">
            {previewType === 'description' ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview) }} />
            ) : (
              <pre className="whitespace-pre-wrap text-xs">{preview}</pre>
            )}
          </div>
        </div>
      )}

      {/* Error display */}
      {(descriptionMutation.isError || improveMutation.isError || seoMutation.isError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {descriptionMutation.error?.message ??
            improveMutation.error?.message ??
            seoMutation.error?.message}
        </div>
      )}
    </div>
  );
}
