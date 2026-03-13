'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useState } from 'react';

interface SeoSettings {
  [key: string]: string;
}

export default function SeoPage() {
  const queryClient = useQueryClient();
  const [settingsForm, setSettingsForm] = useState<SeoSettings>({});

  useQuery({
    queryKey: ['seo-settings'],
    queryFn: async () => {
      const res = await apiClient<{ data: SeoSettings }>('/seo/settings');
      setSettingsForm(res.data);
      return res;
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (data: SeoSettings) =>
      apiClient<{ data: SeoSettings }>('/seo/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['seo-settings'] });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <Settings className="mr-2 inline-block h-6 w-6" />
          SEO Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Global search engine optimization settings for your shop
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">General</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Shop Name</label>
              <input
                type="text"
                value={settingsForm['shop_name'] ?? ''}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, shop_name: e.target.value }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="My Shop"
              />
              <p className="mt-1 text-xs text-muted-foreground">Used in meta title templates</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Default Meta Description Template
              </label>
              <textarea
                value={settingsForm['default_description_template'] ?? ''}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    default_description_template: e.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
                placeholder="{productName} - {shortDescription}. Jetzt bestellen."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Variables: {'{productName}'}, {'{shortDescription}'}, {'{shopName}'}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Google Search Console Verification
              </label>
              <input
                type="text"
                value={settingsForm['google_verification'] ?? ''}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    google_verification: e.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="google-site-verification=..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Default OG Image URL</label>
              <input
                type="text"
                value={settingsForm['og_default_image'] ?? ''}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    og_default_image: e.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="https://shop.example.com/og-image.jpg"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Fallback image for social sharing when product has no image
              </p>
            </div>

            <button
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
              disabled={saveSettingsMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>

            {saveSettingsMutation.isSuccess && (
              <p className="text-sm text-green-600">Settings saved successfully!</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Quick Links</h2>
          <div className="space-y-2 text-sm">
            <p>
              <a
                href="/sitemap.xml"
                target="_blank"
                className="text-primary hover:underline"
                rel="noreferrer"
              >
                📄 View Sitemap (sitemap.xml)
              </a>
            </p>
            <p>
              <a
                href="/robots.txt"
                target="_blank"
                className="text-primary hover:underline"
                rel="noreferrer"
              >
                🤖 View Robots.txt
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
