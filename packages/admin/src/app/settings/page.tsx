'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Store, CreditCard, Truck, Receipt, Bot } from 'lucide-react';

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
          <p className="mt-1 text-muted-foreground">Configure your store</p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="mt-8 space-y-6">
        <SettingsSection title="General" description="Store name, contact, and basic info." icon={Store}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="shopName">Store Name</Label>
              <Input id="shopName" value={shopName} onChange={(e) => setShopName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="shop@example.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+49 ..." className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Street, City, Country" className="mt-1.5" />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Payments" description="Configure payment providers." icon={CreditCard}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="stripeKey">Stripe Secret Key</Label>
              <Input id="stripeKey" type="password" placeholder="sk_live_..." className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="stripeWebhook">Stripe Webhook Secret</Label>
              <Input id="stripeWebhook" type="password" placeholder="whsec_..." className="mt-1.5" />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Shipping" description="Manage shipping methods and rates." icon={Truck}>
          <p className="text-sm text-muted-foreground">
            Shipping configuration is coming soon. You&apos;ll be able to define zones, rates, and carrier integrations here.
          </p>
        </SettingsSection>

        <SettingsSection title="Tax" description="Configure tax rules and rates." icon={Receipt}>
          <p className="text-sm text-muted-foreground">
            Tax configuration is coming soon. EU VAT, US sales tax, and custom tax rules.
          </p>
        </SettingsSection>

        <SettingsSection title="AI" description="Configure AI providers for product descriptions and SEO." icon={Bot}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="openaiKey">OpenAI API Key</Label>
              <Input id="openaiKey" type="password" placeholder="sk-..." className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="anthropicKey">Anthropic API Key</Label>
              <Input id="anthropicKey" type="password" placeholder="sk-ant-..." className="mt-1.5" />
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
