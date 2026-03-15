'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/components/cart/cart-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { useCurrency } from '@/components/currency/currency-provider';
import { useTranslation } from '@forkcart/i18n/react';
import { StripePayment } from '@/components/checkout/stripe-payment';
import { PrepaymentForm } from '@/components/checkout/prepayment-form';
import { Lock, CreditCard, ChevronRight, ChevronLeft, Check, Loader2, Truck } from 'lucide-react';
import { LocaleLink } from '@/components/locale-link';

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

interface ShippingMethodOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimatedDays: string | null;
  freeAbove: number | null;
  calculatedPrice: number;
}

type CheckoutStep = 'address' | 'shipping' | 'payment' | 'success';

export default function CheckoutPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <CheckoutPage />
    </Suspense>
  );
}

function CheckoutPage() {
  const { items, subtotal, clearCart, serverCartId } = useCart();
  const { customer, token } = useAuth();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const searchParams = useSearchParams();
  const cartIdFromUrl = searchParams.get('cartId');
  const [quickCartItems, setQuickCartItems] = useState<Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }> | null>(null);
  const [quickCartSubtotal, setQuickCartSubtotal] = useState(0);

  // Load quick-cart from URL param if present
  useEffect(() => {
    if (!cartIdFromUrl) return;
    fetch(`${API_URL}/api/v1/carts/${cartIdFromUrl}`)
      .then((r) => {
        if (!r.ok) throw new Error('Cart not found');
        return r.json();
      })
      .then((data: { data: { items: typeof quickCartItems; subtotal: number } }) => {
        if (data.data?.items?.length) {
          setQuickCartItems(data.data.items);
          setQuickCartSubtotal(data.data.subtotal);
        }
      })
      .catch(() => {
        setQuickCartItems(null);
      });
  }, [cartIdFromUrl]);

  // Use quick-cart data when available, otherwise regular cart
  const effectiveItems = quickCartItems ?? items;
  const effectiveSubtotal = quickCartItems ? quickCartSubtotal : subtotal;
  const effectiveCartId = cartIdFromUrl ?? serverCartId;

  const [step, setStep] = useState<CheckoutStep>('address');
  const [shipping, setShipping] = useState<ShippingData>({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodOption[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('');
  const [shippingCost, setShippingCost] = useState(0);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [providers, setProviders] = useState<PaymentProviderConfig[]>([]);
  const [fallbackMode, setFallbackMode] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [clientSecret, setClientSecret] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Prefill from logged-in customer's default address
  useEffect(() => {
    if (!customer || !token) return;

    setShipping((s) => ({
      ...s,
      firstName: s.firstName || customer.firstName,
      lastName: s.lastName || customer.lastName,
      email: s.email || customer.email,
    }));

    fetch(`${API_URL}/api/v1/storefront/customers/${customer.id}/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(
        (data: {
          data: Array<{
            isDefault: boolean;
            addressLine1: string;
            city: string;
            postalCode: string;
            country: string;
          }>;
        }) => {
          const defaultAddr =
            data.data?.find((a: { isDefault: boolean }) => a.isDefault) ?? data.data?.[0];
          if (defaultAddr) {
            setShipping((s) => ({
              ...s,
              address: s.address || defaultAddr.addressLine1,
              city: s.city || defaultAddr.city,
              postalCode: s.postalCode || defaultAddr.postalCode,
              country: s.country || defaultAddr.country,
            }));
          }
        },
      )
      .catch((error: unknown) => {
        console.error('[Checkout] Failed to load shipping addresses:', error);
      });
  }, [customer, token]);

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
  if (effectiveItems.length === 0 && step !== 'success' && !cartIdFromUrl) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('checkout.nothingToCheckout')}</h1>
        <p className="mt-2 text-gray-500">{t('cart.empty')}</p>
        <LocaleLink
          href="/category/all"
          className="mt-6 inline-flex rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t('checkout.browseProducts')}
        </LocaleLink>
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
        <h1 className="mt-6 text-2xl font-bold text-gray-900">{t('checkout.orderConfirmed')}</h1>
        {orderNumber && <p className="mt-2 text-lg font-mono text-gray-700">{orderNumber}</p>}
        <p className="mt-2 text-gray-500">
          {t('checkout.confirmationEmail')} <span className="font-medium">{shipping.email}</span>.
        </p>
        <LocaleLink
          href="/"
          className="mt-6 inline-flex rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t('checkout.backToHome')}
        </LocaleLink>
      </div>
    );
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError('');
    setLoadingShipping(true);

    try {
      const res = await fetch(
        `${API_URL}/api/v1/shipping/methods/available?country=${encodeURIComponent(shipping.country)}&total=${subtotal}`,
      );
      if (!res.ok) throw new Error('Failed to load shipping methods');
      const data = (await res.json()) as { data: ShippingMethodOption[] };
      setShippingMethods(data.data);

      if (data.data.length > 0) {
        setSelectedShippingMethod(data.data[0]!.id);
        setShippingCost(data.data[0]!.calculatedPrice);
      }

      setStep('shipping');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to load shipping methods');
    } finally {
      setLoadingShipping(false);
    }
  }

  function handleShippingMethodSelect(methodId: string) {
    setSelectedShippingMethod(methodId);
    const method = shippingMethods.find((m) => m.id === methodId);
    if (method) {
      setShippingCost(method.calculatedPrice);
    }
  }

  async function handleShippingSubmit() {
    setPaymentError('');

    if (!fallbackMode && selectedProvider) {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/payments/create-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: effectiveCartId,
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
            shippingMethodId: selectedShippingMethod,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { error?: { message?: string } }).error?.message ??
              'Failed to initialize payment',
          );
        }

        const data = (await res.json()) as {
          data: { clientSecret: string; clientData?: { publishableKey?: string } };
        };
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
          cartId: effectiveCartId,
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
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ?? 'Order creation failed',
        );
      }

      const data = (await res.json()) as { data: { orderNumber: string } };
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
        <span className={step === 'address' ? 'font-semibold text-gray-900' : 'text-gray-500'}>
          1. {t('checkout.address')}
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className={step === 'shipping' ? 'font-semibold text-gray-900' : 'text-gray-500'}>
          2. {t('checkout.shipping')}
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className={step === 'payment' ? 'font-semibold text-gray-900' : 'text-gray-500'}>
          3. {t('checkout.payment')}
        </span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('checkout.title')}</h1>

      <div className="mt-8 grid gap-12 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* STEP 1: Address */}
          {step === 'address' && (
            <form onSubmit={handleAddressSubmit}>
              <section className="rounded-lg border p-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('checkout.shippingAddress')}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      {t('checkout.firstName')}
                    </label>
                    <input
                      id="firstName"
                      required
                      value={shipping.firstName}
                      onChange={(e) => setShipping((s) => ({ ...s, firstName: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      {t('checkout.lastName')}
                    </label>
                    <input
                      id="lastName"
                      required
                      value={shipping.lastName}
                      onChange={(e) => setShipping((s) => ({ ...s, lastName: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      {t('checkout.email')}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={shipping.email}
                      onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="text-sm font-medium text-gray-700">
                      {t('checkout.address')}
                    </label>
                    <input
                      id="address"
                      required
                      value={shipping.address}
                      onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className="text-sm font-medium text-gray-700">
                      {t('checkout.city')}
                    </label>
                    <input
                      id="city"
                      required
                      value={shipping.city}
                      onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="text-sm font-medium text-gray-700">
                      {t('checkout.zip')}
                    </label>
                    <input
                      id="postalCode"
                      required
                      value={shipping.postalCode}
                      onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="country" className="text-sm font-medium text-gray-700">
                      {t('checkout.country')}
                    </label>
                    <select
                      id="country"
                      required
                      value={shipping.country}
                      onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">{t('checkout.selectCountry')}</option>
                      <option value="DE">{t('countries.DE')}</option>
                      <option value="AT">{t('countries.AT')}</option>
                      <option value="CH">{t('countries.CH')}</option>
                      <option value="US">{t('countries.US')}</option>
                      <option value="GB">{t('countries.GB')}</option>
                      <option value="FR">{t('countries.FR')}</option>
                      <option value="NL">{t('countries.NL')}</option>
                    </select>
                  </div>
                </div>
              </section>

              {paymentError && (
                <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                  {paymentError}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingShipping}
                className="mt-6 flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {loadingShipping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                {t('checkout.continueToShipping')}
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Shipping Method */}
          {step === 'shipping' && (
            <div>
              <button
                onClick={() => setStep('address')}
                className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-4 w-4" /> {t('checkout.backToAddress')}
              </button>

              <section className="rounded-lg border p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Truck className="h-5 w-5" />
                  {t('checkout.shippingMethod')}
                </h2>

                {shippingMethods.length === 0 && (
                  <p className="mt-4 text-sm text-gray-500">{t('checkout.noShippingMethods')}</p>
                )}

                <div className="mt-4 space-y-3">
                  {shippingMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition ${
                        selectedShippingMethod === method.id
                          ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={method.id}
                          checked={selectedShippingMethod === method.id}
                          onChange={() => handleShippingMethodSelect(method.id)}
                          className="h-4 w-4"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{method.name}</p>
                          {method.description && (
                            <p className="text-sm text-gray-500">{method.description}</p>
                          )}
                          {method.estimatedDays && (
                            <p className="text-xs text-gray-400">
                              {t('checkout.estimatedDays', { days: method.estimatedDays })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {method.calculatedPrice === 0 ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800">
                            {t('checkout.free')}
                          </span>
                        ) : (
                          <span className="font-medium">{formatPrice(method.calculatedPrice)}</span>
                        )}
                        {method.freeAbove && method.calculatedPrice > 0 && (
                          <p className="text-xs text-gray-400">
                            {t('checkout.freeAbove', { amount: formatPrice(method.freeAbove) })}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {paymentError && (
                  <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                    {paymentError}
                  </div>
                )}
              </section>

              <button
                onClick={handleShippingSubmit}
                disabled={loading || !selectedShippingMethod}
                className="mt-6 flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {t('checkout.continueToPayment')}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 3: Payment */}
          {step === 'payment' && (
            <div>
              <button
                onClick={() => setStep('shipping')}
                className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-4 w-4" /> {t('checkout.backToShipping')}
              </button>

              <section className="rounded-lg border p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <CreditCard className="h-5 w-5" />
                  {t('checkout.payment')}
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
                    <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                      {paymentError}
                    </div>
                  )}

                  {!fallbackMode &&
                    currentProviderConfig?.componentType === 'stripe-payment-element' &&
                    clientSecret &&
                    publishableKey && (
                      <StripePayment
                        clientSecret={clientSecret}
                        publishableKey={publishableKey}
                        onSuccess={handleStripeSuccess}
                        onError={setPaymentError}
                      />
                    )}

                  {fallbackMode && <PrepaymentForm onSubmit={handlePrepaymentComplete} />}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="sticky top-24 rounded-lg bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('checkout.orderSummary')}</h2>
            <div className="mt-4 divide-y">
              {effectiveItems.map((item) => (
                <div key={item.id} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-gray-500">{t('checkout.qty', { count: item.quantity })}</p>
                  </div>
                  <p className="font-medium">{formatPrice(item.totalPrice)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('cart.subtotal')}</span>
                <span className="font-medium">{formatPrice(effectiveSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('cart.shipping')}</span>
                <span className={`font-medium ${shippingCost === 0 ? 'text-green-600' : ''}`}>
                  {step === 'address'
                    ? '—'
                    : shippingCost === 0
                      ? t('checkout.free')
                      : formatPrice(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">{t('cart.total')}</span>
                <span className="text-lg font-bold">
                  {formatPrice(effectiveSubtotal + shippingCost)}
                </span>
              </div>
            </div>

            <p className="mt-4 flex items-center gap-1 text-center text-xs text-gray-400">
              <Lock className="h-3 w-3" />
              {t('checkout.paymentSecure')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
