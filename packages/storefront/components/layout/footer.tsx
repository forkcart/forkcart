import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-gray-50">
      <div className="container-page py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">Shop</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/category/all" className="text-sm text-gray-500 hover:text-gray-900">All Products</Link></li>
              <li><Link href="/search" className="text-sm text-gray-500 hover:text-gray-900">Search</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">Company</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="#" className="text-sm text-gray-500 hover:text-gray-900">About</Link></li>
              <li><Link href="#" className="text-sm text-gray-500 hover:text-gray-900">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">Legal</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="#" className="text-sm text-gray-500 hover:text-gray-900">Privacy Policy</Link></li>
              <li><Link href="#" className="text-sm text-gray-500 hover:text-gray-900">Terms of Service</Link></li>
              <li><Link href="#" className="text-sm text-gray-500 hover:text-gray-900">Imprint</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">Newsletter</h3>
            <p className="mt-4 text-sm text-gray-500">Get updates on new products and sales.</p>
            <form className="mt-3 flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="h-9 flex-1 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                Subscribe
              </button>
            </form>
          </div>
        </div>
        <div className="mt-12 border-t pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} ForkCart. Powered by open source.
        </div>
      </div>
    </footer>
  );
}
