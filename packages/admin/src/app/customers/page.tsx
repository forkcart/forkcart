export default function CustomersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Customers</h1>
      <p className="mt-1 text-muted-foreground">Manage your customer base</p>
      <div className="mt-8 rounded-lg border bg-card p-8 text-center text-muted-foreground shadow-sm">
        No customers yet. Customers will be created when they register or place their first order.
      </div>
    </div>
  );
}
