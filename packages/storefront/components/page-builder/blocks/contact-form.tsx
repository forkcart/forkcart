'use client';

import { cn } from '@/lib/utils';

interface ContactFormProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  showPhone?: boolean;
  showSubject?: boolean;
  backgroundColor?: string;
  className?: string;
}

export function RenderContactForm({
  title = 'Get in Touch',
  subtitle,
  buttonText = 'Send Message',
  showPhone = false,
  showSubject = true,
  backgroundColor = '#ffffff',
  className,
}: ContactFormProps) {
  return (
    <section
      className={cn('mx-auto w-full max-w-2xl px-6 py-16', className)}
      style={{ backgroundColor }}
    >
      {title && <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">{title}</h2>}
      {subtitle && <p className="mb-8 text-center text-gray-500">{subtitle}</p>}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          alert('Thank you for your message! We will get back to you soon.');
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
        </div>
        {showPhone && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        )}
        {showSubject && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="How can we help?"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
          <textarea
            rows={5}
            required
            className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your message..."
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {buttonText}
        </button>
      </form>
    </section>
  );
}
