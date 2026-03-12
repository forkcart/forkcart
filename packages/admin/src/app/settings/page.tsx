'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Store } from 'lucide-react';

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [shopName, setShopName] = useState('My ForkCart Store');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">General store configuration</p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="mt-8 space-y-6">
        <SettingsSection
          title="Store Details"
          description="Basic information about your store."
          icon={Store}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input
                id="shopName"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="shop@example.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+49 ..."
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, Country"
                className="mt-1.5"
              />
            </div>
          </div>
        </SettingsSection>

        <div className="rounded-lg border bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground">
            Looking for other settings? They have their own pages now:
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              💳 <strong>Payments</strong> →{' '}
              <a href="/plugins" className="text-primary hover:underline">
                Plugins
              </a>
            </li>
            <li>
              🚚 <strong>Shipping</strong> →{' '}
              <a href="/shipping" className="text-primary hover:underline">
                Shipping
              </a>
            </li>
            <li>
              🧮 <strong>Tax</strong> →{' '}
              <a href="/tax" className="text-primary hover:underline">
                Tax
              </a>
            </li>
            <li>
              🤖 <strong>AI Provider</strong> →{' '}
              <a href="/ai" className="text-primary hover:underline">
                AI Settings
              </a>
            </li>
            <li>
              📧 <strong>Emails</strong> →{' '}
              <a href="/plugins" className="text-primary hover:underline">
                Plugins
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
