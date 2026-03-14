'use client';

import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export function ImageUpload({
  value,
  onChange,
  label = 'Image',
  placeholder = 'Upload or enter URL...',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('token') ?? '';
      const form = new FormData();
      form.append('file', file);
      form.append('entityType', 'page');

      const res = await fetch(`${API_URL}/api/v1/media/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      const url = json.data?.url ?? json.data?.path ?? '';
      // Ensure full URL
      const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
      onChange(fullUrl);
    } catch (err) {
      console.error('[ImageUpload] Upload failed:', err);
      alert('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) upload(file);
  };

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
          'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors',
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300',
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
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Uploading...
          </div>
        ) : (
          <>
            <Upload className="h-5 w-5 text-gray-400" />
            <span className="text-xs text-gray-500">Click or drop image</span>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* URL fallback */}
      <input
        type="text"
        className="w-full rounded border p-2 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
