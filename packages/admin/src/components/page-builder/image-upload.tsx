'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/auth';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export function ImageUpload({ value, onChange, label = 'Image' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type)) {
        setError('Only JPG, PNG, WebP, GIF allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Max 10MB');
        return;
      }

      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('entityType', 'page');

        const res = await fetch(`${API_BASE_URL}/api/v1/media/upload`, {
          method: 'POST',
          headers: authHeaders(),
          body: form,
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          throw new Error(err.error?.message ?? `Upload failed: ${res.status}`);
        }

        const json = (await res.json()) as { data: { url?: string; path?: string } };
        const url = json.data?.url ?? json.data?.path ?? '';
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
        onChange(fullUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        console.error('[ImageUpload] Upload failed:', err);
        setError(msg);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) upload(file);
    },
    [upload],
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

  return (
    <div className="space-y-2">
      {label && <label className="mb-1 block text-sm font-medium">{label}</label>}

      {/* Preview */}
      {value && (
        <div className="relative overflow-hidden rounded-lg border">
          <img
            src={value}
            alt="Preview"
            className="h-32 w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            onClick={() => onChange('')}
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Upload area */}
      <div
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-400',
          uploading && 'pointer-events-none opacity-50',
        )}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Uploading...
          </div>
        ) : (
          <>
            <Upload className="mb-1 h-6 w-6 text-gray-400" />
            <p className="text-sm text-gray-500">Drop image here or click to upload</p>
            <p className="mt-0.5 text-xs text-gray-400">JPG, PNG, WebP, GIF — max 10MB</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* URL fallback */}
      <input
        type="text"
        className="w-full rounded border p-2 text-xs text-gray-500"
        placeholder="...or paste image URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
