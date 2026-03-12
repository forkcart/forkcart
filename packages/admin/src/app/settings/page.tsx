'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Save,
  Store,
  Truck,
  Calculator,
  Sparkles,
  Mail,
  MessageCircle,
  Globe,
  Search,
  CreditCard,
  ChevronRight,
} from 'lucide-react';

const SETTINGS_SECTIONS = [
  {
    href: '/ai',
    label: 'AI & Chatbot',
    description: 'Configure AI provider, API key, chatbot settings',
    icon: Sparkles,
  },
  {
    href: '/plugins',
    label: 'Payments & Plugins',
    description: 'Stripe, payment methods, plugin management',
    icon: CreditCard,
  },
  {
    href: '/shipping',
    label: 'Shipping',
    description: 'Shipping methods, rates, zones',
    icon: Truck,
  },
  {
    href: '/tax',
    label: 'Tax',
    description: 'Tax classes, zones, rules, VAT settings',
    icon: Calculator,
  },
  {
    href: '/emails',
    label: 'Emails',
    description: 'Email templates, Mailgun, transactional emails',
    icon: Mail,
  },
  {
    href: '/seo',
    label: 'SEO',
    description: 'Meta tags, sitemap, Schema.org, Open Graph',
    icon: Globe,
  },
  {
    href: '/search',
    label: 'Search Analytics',
    description: 'Search queries, zero-result tracking, popular terms',
    icon: Search,
  },
  {
    href: '/chatbot',
    label: 'Chat Sessions',
    description: 'View customer chat conversations',
    icon: MessageCircle,
  },
];

export default function SettingsPage() {
  const [shopName, setShopName] = useState('My ForkCart Store');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('EUR');
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
          <p className="mt-1 text-muted-foreground">Store configuration & quick links</p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="mt-8 space-y-8">
        {/* Store Details */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">Store Details</h2>
              <p className="text-sm text-muted-foreground">Basic information about your store</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+49 ..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, Country"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="EUR"
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Settings Hub */}
        <div>
          <h2 className="text-lg font-semibold">All Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick links to all configuration areas
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SETTINGS_SECTIONS.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="truncate text-sm text-muted-foreground">{description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
