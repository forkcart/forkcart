'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@forkcart/i18n/react';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProductRef[];
  timestamp: string;
}

interface ChatProductRef {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string;
}

// ── Cart helpers (shared with cart-provider via localStorage) ──────────

function getOrCreateCartId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('forkcart_cart_id');
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('forkcart_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem('forkcart_session_id', sid);
  }
  return sid;
}

async function ensureCart(): Promise<string> {
  const existing = getOrCreateCartId();
  if (existing) return existing;

  const res = await fetch(`${API_URL}/api/v1/carts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: getSessionId() }),
  });
  const data = (await res.json()) as { data: { id: string } };
  const id = data.data.id;
  localStorage.setItem('forkcart_cart_id', id);
  return id;
}

// ── Markdown-link parser for action buttons ───────────────────────────

interface ParsedSegment {
  type: 'text' | 'add-to-cart' | 'buy-now';
  text: string;
  productIds?: string;
}

/** Parse assistant message content into text segments + action buttons */
function parseMessageContent(content: string): ParsedSegment[] {
  // Matches both [text](/add-to-cart?product=ID) and [text](/quick-checkout?products=IDs)
  const linkRegex = /\[([^\]]+)\]\(\/(add-to-cart\?product=|quick-checkout\?products=)([^)]+)\)/g;

  const segments: ParsedSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }

    const linkText = match[1]!;
    const action = match[2]!;
    const ids = match[3]!;

    segments.push({
      type: action.startsWith('add-to-cart') ? 'add-to-cart' : 'buy-now',
      text: linkText,
      productIds: ids,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', text: content.slice(lastIndex) });
  }

  return segments;
}

// ── Action button components ──────────────────────────────────────────

function AddToCartButton({
  productId,
  label,
  onAdded,
}: {
  productId: string;
  label: string;
  onAdded: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick() {
    if (busy || done) return;
    setBusy(true);
    try {
      const cartId = await ensureCart();
      const res = await fetch(`${API_URL}/api/v1/carts/${cartId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ?? 'Failed to add',
        );
      }
      setDone(true);
      // Dispatch storage event so CartProvider picks up the change
      window.dispatchEvent(new Event('forkcart:cart-updated'));
      onAdded('Added to cart! ✓');
    } catch (err) {
      onAdded(`Could not add to cart: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy || done}
      className={`my-1 mr-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        done
          ? 'border-green-300 bg-green-50 text-green-700'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
      } disabled:opacity-60`}
    >
      {done ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Added
        </>
      ) : busy ? (
        <>
          <svg
            className="h-3.5 w-3.5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Adding…
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function BuyNowButton({ productIds, label }: { productIds: string; label: string }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const items = productIds.split(',').map((id) => ({ productId: id.trim(), quantity: 1 }));
      const res = await fetch(`${API_URL}/api/v1/carts/quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ?? 'Checkout failed',
        );
      }
      const data = (await res.json()) as { data: { checkoutUrl: string } };
      if (data.data.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      }
    } catch {
      // Silently fail — user can retry
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="my-1 mr-2 inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
    >
      {busy ? (
        <>
          <svg
            className="h-3.5 w-3.5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Redirecting…
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ── Render message content with inline action buttons ─────────────────

function AssistantMessageContent({
  content,
  onSystemMessage,
}: {
  content: string;
  onSystemMessage: (msg: string) => void;
}) {
  const segments = parseMessageContent(content);

  return (
    <div className="whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === 'add-to-cart') {
          return (
            <AddToCartButton
              key={i}
              productId={seg.productIds!}
              label={seg.text}
              onAdded={onSystemMessage}
            />
          );
        }
        // buy-now
        return <BuyNowButton key={i} productIds={seg.productIds!} label={seg.text} />;
      })}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────

/** Floating chat widget — only renders when AI is configured */
export function ChatWidget() {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check chatbot availability on mount
  useEffect(() => {
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem('forkcart_chat_session') : null;
    if (stored) setSessionId(stored);

    fetch(`${API_URL}/api/v1/chat/status`)
      .then((r) => r.json())
      .then((res: { data: { available: boolean; welcomeMessage: string | null } }) => {
        setAvailable(res.data.available);
        if (res.data.welcomeMessage) setWelcomeMessage(res.data.welcomeMessage);
      })
      .catch(() => setAvailable(false));
  }, []);

  // Load existing session messages
  useEffect(() => {
    if (!sessionId || !open) return;
    fetch(`${API_URL}/api/v1/chat/${sessionId}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((res: { data: { messages: ChatMessage[] } } | null) => {
        if (res?.data?.messages) {
          setMessages(res.data.messages);
        }
      })
      .catch(() => {});
  }, [sessionId, open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** Append a system-style message (e.g. "Added to cart! ✓") */
  const addSystemMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Error' } }));
        throw new Error(
          (err as { error: { message: string } }).error?.message ?? 'Failed to send message',
        );
      }

      const data = (await res.json()) as {
        data: { reply: string; sessionId: string; products?: ChatProductRef[] };
      };

      // Save session ID
      if (data.data.sessionId && data.data.sessionId !== sessionId) {
        setSessionId(data.data.sessionId);
        localStorage.setItem('forkcart_chat_session', data.data.sessionId);
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.data.reply,
        products: data.data.products,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: t('chat.error'),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  if (!available) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label={t('chat.open')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[380px] sm:rounded-2xl sm:border">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-black px-4 py-3 text-white sm:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">{t('chat.support')}</p>
                <p className="text-xs text-white/70">{t('chat.poweredBy')}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-white/10"
              aria-label={t('chat.close')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[280px] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm">
                  {welcomeMessage ?? t('chat.welcome')}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[280px]">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'rounded-br-md bg-black text-white'
                        : 'rounded-bl-md bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <AssistantMessageContent
                        content={msg.content}
                        onSystemMessage={addSystemMessage}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.products.map((product) => (
                        <a
                          key={product.id}
                          href={`/product/${product.slug}`}
                          className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xs">
                            📦
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-gray-500">
                              {(product.price / 100).toFixed(2).replace('.', ',')} €
                            </p>
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-400"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="mb-3 flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chat.placeholder')}
                className="flex-1 rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                maxLength={2000}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white transition-opacity disabled:opacity-30"
                aria-label={t('chat.send')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
