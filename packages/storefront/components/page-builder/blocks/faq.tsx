'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqProps {
  items?: FaqItem[];
  title?: string;
  allowMultiple?: boolean;
  className?: string;
}

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-700"
        onClick={onToggle}
        type="button"
      >
        {item.question}
        <svg
          className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <p className="pb-4 text-sm text-gray-600">{item.answer}</p>}
    </div>
  );
}

export function RenderFaq({
  items = [],
  title = 'Frequently Asked Questions',
  allowMultiple = false,
  className,
}: FaqProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  if (!items.length) return null;

  const toggleItem = (idx: number) => {
    setOpenItems((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <section className={cn('mx-auto w-full max-w-3xl px-6 py-16', className)}>
      {title && <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">{title}</h2>}
      <div className="rounded-lg border">
        <div className="divide-y px-6">
          {items.map((item, idx) => (
            <AccordionItem
              key={idx}
              item={item}
              isOpen={openItems.has(idx)}
              onToggle={() => toggleItem(idx)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
