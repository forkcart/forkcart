import { Package, ShoppingCart, Users, TrendingUp } from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Welcome to ForkCart Admin</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Products" value="0" icon={Package} description="Active products in store" />
        <StatCard title="Total Orders" value="0" icon={ShoppingCart} description="Orders this month" />
        <StatCard title="Customers" value="0" icon={Users} description="Registered customers" />
        <StatCard title="Revenue" value="€0.00" icon={TrendingUp} description="Revenue this month" />
      </div>

      <div className="mt-8 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Getting Started</h2>
        <p className="mt-2 text-muted-foreground">
          Start by adding products, configuring shipping methods, and setting up your storefront.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <p>1. Add your first product in the Products section</p>
          <p>2. Create categories to organize your catalog</p>
          <p>3. Configure shipping and tax rules in Settings</p>
          <p>4. Connect your payment provider (Stripe recommended)</p>
        </div>
      </div>
    </div>
  );
}
