'use client';

import { useState, useEffect } from 'react';
import { formatPrice } from '@forkcart/shared';
import { useCart } from '@/components/cart/cart-provider';
import { StripePayment } from '@/components/checkout/stripe-payment';
import { PrepaymentForm } from '@/components/checkout/prepayment-form';
import { Lock, CreditCard, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

interface PaymentProviderConfig {
  provider: string;
  displayName: string;
  componentType: string;
  clientConfig: Record<string, unknown>;
}

interface ProvidersResponse {
  data: {
    providers: PaymentProviderConfig[];
    fallbackMode: boolean;
  };
}

interface ShippingData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

type CheckoutStep = 'shipping' | 'payment' | 'success';

export default function CheckoutPage() {
  const { items, subtotal, clearCart, serverCartId } = useCart();
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [shipping, setShipping] = useState<ShippingData>({
    firstName: '', lastName: '', email: '', address: '', city: '', postalCode: '', country: '',
  });
  const [providers, setProviders] = useState<PaymentProviderConfig[]>([]);
  const [fallbackMode, setFallbackMode] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [clientSecret, setClientSecret] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Fetch available payment providers
  useEffect(() => {
    fetch(`${API_URL}/api/v1/payments/providers`)
      .then((res) => res.json())
      .then((data: ProvidersResponse) => {
        setProviders(data.data.providers);
        setFallbackMode(data.data.fallbackMode);
        if (data.data.providers.length > 0) {
          setSelectedProvider(data.data.providers[0]!.provider);
        }
      })
      .catch(() => {
        setFallbackMode(true);
      });
  }, []);

  // Empty cart guard
  if (items.length === 0 && step !== 'success') {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Nothing to checkout</h1>
        <p className="mt-2 text-gray-500">Your cart is empty.</p>
        <Link href="/category/all" className="mt-6 inline-flex rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800">
          Browse Products
        </Link>
      </div>
    );
  }

  // Success page
  if (step === 'success') {
    return (
      <div className="container-page py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Order confirmed!</h1>
        {orderNumber && (
          <p className="mt-2 text-lg font-mono text-gray-700">{orderNumber}</p>
        )}
        <p className="mt-2 text-gray-500">
          Thank you for your purchase. You&apos;ll receive a confirmation email at{' '}
          <span className="font-medium">{shipping.email}</span>.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800">
          Back to Home
        </Link>
      </div>
    );
  }

  async function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError('');

    if (!fallbackMode && selectedProvider) {
      // Create payment intent with the selected provider
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/payments/create-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: serverCartId,
            providerId: selectedProvider,
            customer: {
              email: shipping.email,
              firstName: shipping.firstName,
              lastName: shipping.lastName,
            },
            shippingAddress: {
              firstName: shipping.firstName,
              lastName: shipping.lastName,
              addressLine1: shipping.address,
              city: shipping.city,
              postalCode: shipping.postalCode,
              country: shipping.country,
            },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: { message?: string } }).error?.message ?? 'Failed to initialize payment');
        }

        const data = await res.json() as { data: { clientSecret: string; clientData?: { publishableKey?: string } } };
        setClientSecret(data.data.clientSecret);
        if (data.data.clientData?.publishableKey) {
          setPublishableKey(data.data.clientData.publishableKey as string);
        }
        setStep('payment');
      } catch (err) {
        setPaymentError(err instanceof Error ? err.message : 'Payment initialization failed');
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback mode — go directly to payment step with prepayment
      setStep('payment');
    }
  }

  async function handlePrepaymentComplete() {
    setLoading(true);
    setPaymentError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/payments/demo-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: serverCartId,
          customerEmail: shipping.email,
          shippingAddress: {
            firstName: shipping.firstName,
            lastName: shipping.lastName,
            addressLine1: shipping.address,
            city: shipping.city,
            postalCode: shipping.postalCode,
            country: shipping.country,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message ?? 'Order creation failed');
      }

      const data = await res.json() as { data: { orderNumber: string } };
      setOrderNumber(data.data.orderNumber);
      clearCart();
      setStep('success');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  }

  function handleStripeSuccess() {
    clearCart();
    setStep('success');
  }

  const currentProviderConfig = providers.find((p) => p.provider === selectedProvider);

  return (
    <div className="container-page py-12">
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2 text-sm">
        <span className={step === 'shipping' ? 'font-semibold text-gray-900' : 'text-gray-500'}>
          1. Shipping
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className={step === 'payment' ? 'font-semibold text-gray-900' : 'text-gray-500'}>
          2. Payment
        </span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Checkout</h1>

      <div className="mt-8 grid gap-12 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* STEP 1: Shipping */}
          {step === 'shipping' && (
            <form onSubmit={handleShippingSubmit}>
              <section className="rounded-lg border p-6">
                <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</label>
                    <input id="firstName" required value={shipping.firstName}
                      onChange={(e) => setShipping((s) => ({ ...s, firstName: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</label>
                    <input id="lastName" required value={shipping.lastName}
                      onChange={(e) => setShipping((s) => ({ ...s, lastName: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                    <input id="email" type="email" required value={shipping.email}
                      onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="text-sm font-medium text-gray-700">Address</label>
                    <input id="address" required value={shipping.address}
                      onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label htmlFor="city" className="text-sm font-medium text-gray-700">City</label>
                    <input id="city" required value={shipping.city}
                      onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="text-sm font-medium text-gray-700">Postal Code</label>
                    <input id="postalCode" required value={shipping.postalCode}
                      onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="country" className="text-sm font-medium text-gray-700">Country</label>
                    <select id="country" required value={shipping.country}
                      onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-accent">
                      <option value="">Select country</option>
                      <option value="DE">Germany</option>
                      <option value="AT">Austria</option>
                      <option value="CH">Switzerland</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="FR">France</option>
                      <option value="NL">Netherlands</option>
                    </select>
                  </div>
                </div>
              </section>

              {paymentError && (
                <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{paymentError}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Continue to Payment
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Payment */}
          {step === 'payment' && (
            <div>
              <button
                onClick={() => setStep('shipping')}
                className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Shipping
              </button>

              <section className="rounded-lg border p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </h2>

                {/* Provider selection (if multiple) */}
                {providers.length > 1 && (
                  <div className="mt-4 flex gap-3">
                    {providers.map((p) => (
                      <button
                        key={p.provider}
                        onClick={() => setSelectedProvider(p.provider)}
                        className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
                          selectedProvider === p.provider
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {p.displayName}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  {paymentError && (
                    <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{paymentError}</div>
                  )}

                  {/* Stripe Payment Element */}
                  {!fallbackMode && currentProviderConfig?.componentType === 'stripe-payment-element' && clientSecret && publishableKey && (
                    <StripePayment
                      clientSecret={clientSecret}
                      publishableKey={publishableKey}
                      onSuccess={handleStripeSuccess}
                      onError={setPaymentError}
                    />
                  )}

                  {/* Fallback: Prepayment / Demo mode */}
                  {fallbackMode && (
                    <PrepaymentForm onSubmit={handlePrepaymentComplete} />
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="sticky top-24 rounded-lg bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            <div className="mt-4 divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">{formatPrice(item.totalPrice)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium text-green-600">Free</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold">{formatPrice(subtotal)}</span>
              </div>
            </div>

            <p className="mt-4 flex items-center gap-1 text-center text-xs text-gray-400">
              <Lock className="h-3 w-3" />
              Your payment is secure and encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
