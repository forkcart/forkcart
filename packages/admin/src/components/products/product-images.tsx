'use client';

import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Media } from '@forkcart/shared';
import { getToken } from '@/lib/auth';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface ProductImagesProps {
  productId: string;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function fetchProductImages(productId: string): Promise<Media[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/images`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load images');
  const json = (await res.json()) as { data: Media[] };
  return json.data;
}

async function uploadImage(productId: string, file: File, sortOrder: number): Promise<Media> {
  const form = new FormData();
  form.append('file', file);
  form.append('sortOrder', String(sortOrder));
  const res = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/images`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Upload failed: ${res.status}`);
  }
  const json = (await res.json()) as { data: Media };
  return json.data;
}

async function deleteImage(productId: string, mediaId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/images/${mediaId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete image');
}

async function reorderImages(
  productId: string,
  items: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/images/reorder`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Failed to reorder');
}

export function ProductImages({ productId }: ProductImagesProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['product-images', productId],
    queryFn: () => fetchProductImages(productId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImage(productId, file, images.length),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => deleteImage(productId, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ id: string; sortOrder: number }>) =>
      reorderImages(productId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
    },
  });

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      for (const file of Array.from(files)) {
        if (allowed.includes(file.type) && file.size <= 10 * 1024 * 1024) {
          uploadMutation.mutate(file);
        }
      }
    },
    [uploadMutation],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // Image reorder via drag
  const handleImageDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleImageDrop = useCallback(
    (targetIdx: number) => {
      if (dragIdx === null || dragIdx === targetIdx) return;
      const reordered = [...images];
      const [moved] = reordered.splice(dragIdx, 1);
      if (moved) {
        reordered.splice(targetIdx, 0, moved);
        const items = reordered.map((img, i) => ({ id: img.id, sortOrder: i }));
        reorderMutation.mutate(items);
      }
      setDragIdx(null);
    },
    [dragIdx, images, reorderMutation],
  );

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold">Images</h3>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-2 h-10 w-10 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-muted-foreground">
          {uploadMutation.isPending ? 'Uploading…' : 'Drop images here or click to upload'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">JPG, PNG, WebP, GIF — max 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {uploadMutation.isError && (
        <p className="mt-2 text-sm text-destructive">{uploadMutation.error.message}</p>
      )}

      {/* Image Grid */}
      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading images…</p>
      ) : images.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleImageDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleImageDrop(idx)}
              className={`group relative aspect-square overflow-hidden rounded-lg border bg-muted ${
                dragIdx === idx ? 'opacity-50' : ''
              }`}
            >
              <img
                src={img.url}
                alt={img.alt ?? img.originalName}
                className="h-full w-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Main
                </span>
              )}
              <button
                type="button"
                onClick={() => deleteMutation.mutate(img.id)}
                disabled={deleteMutation.isPending}
                className="absolute right-1.5 top-1.5 rounded-full bg-destructive/80 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <div className="absolute inset-x-0 bottom-0 cursor-grab bg-black/40 p-1 text-center text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                Drag to reorder
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No images yet.</p>
      )}
    </div>
  );
}
