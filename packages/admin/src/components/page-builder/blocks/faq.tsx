'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqProps {
  items?: FaqItem[];
  title?: string;
  allowMultiple?: boolean;
  className?: string;
}

const defaultItems: FaqItem[] = [
  {
    question: 'What is your return policy?',
    answer:
      'We offer a 30-day money-back guarantee on all products. Simply contact our support team to initiate a return.',
  },
  {
    question: 'How long does shipping take?',
    answer:
      'Standard shipping takes 3-5 business days. Express shipping is available for 1-2 business day delivery.',
  },
  {
    question: 'Do you offer international shipping?',
    answer:
      'Yes! We ship to over 50 countries worldwide. Shipping costs and delivery times vary by destination.',
  },
];

function AccordionItem({
  item,
  idx,
  isOpen,
  onToggle,
  selected,
  setProp,
}: {
  item: FaqItem;
  idx: number;
  isOpen: boolean;
  onToggle: () => void;
  selected?: boolean;
  setProp: (cb: (props: FaqProps) => void) => void;
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-700"
        onClick={onToggle}
        type="button"
      >
        <span
          className={cn(
            'outline-none',
            selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
          )}
          contentEditable={selected}
          suppressContentEditableWarning
          onBlur={(e) =>
            setProp((p: FaqProps) => {
              const list = [...(p.items ?? defaultItems)];
              list[idx] = { ...list[idx]!, question: e.currentTarget.textContent ?? '' };
              p.items = list;
            })
          }
          onClick={(e) => selected && e.stopPropagation()}
        >
          {item.question}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
      {isOpen && (
        <p
          className={cn(
            'pb-4 text-sm text-gray-600 outline-none',
            selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
          )}
          contentEditable={selected}
          suppressContentEditableWarning
          onBlur={(e) =>
            setProp((p: FaqProps) => {
              const list = [...(p.items ?? defaultItems)];
              list[idx] = { ...list[idx]!, answer: e.currentTarget.textContent ?? '' };
              p.items = list;
            })
          }
        >
          {item.answer}
        </p>
      )}
    </div>
  );
}

export const Faq: UserComponent<FaqProps> = ({
  items = defaultItems,
  title = 'Frequently Asked Questions',
  allowMultiple = false,
  className,
}) => {
  const {
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

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
    <StyledBlock className={cn('mx-auto w-full max-w-3xl px-6 py-16', className)}>
      {title && (
        <h2
          className={cn(
            'mb-8 text-center text-2xl font-bold text-gray-900 outline-none',
            selected && 'cursor-text rounded ring-1 ring-blue-300 ring-offset-1',
          )}
          contentEditable={selected}
          suppressContentEditableWarning
          onBlur={(e) => setProp((p: FaqProps) => (p.title = e.currentTarget.textContent ?? ''))}
        >
          {title}
        </h2>
      )}
      <div className="rounded-lg border">
        <div className="divide-y px-6">
          {items.map((item, idx) => (
            <AccordionItem
              key={idx}
              item={item}
              idx={idx}
              isOpen={openItems.has(idx)}
              onToggle={() => toggleItem(idx)}
              selected={selected}
              setProp={setProp}
            />
          ))}
        </div>
      </div>
    </StyledBlock>
  );
};

function FaqSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as FaqProps }));

  const items = props.items ?? defaultItems;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.title ?? 'Frequently Asked Questions'}
          onChange={(e) => setProp((p: FaqProps) => (p.title = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={props.allowMultiple ?? false}
            onChange={(e) => setProp((p: FaqProps) => (p.allowMultiple = e.target.checked))}
          />
          Allow multiple open
        </label>
      </div>
      <hr />
      <h4 className="text-sm font-semibold">Questions ({items.length})</h4>
      {items.map((item, idx) => (
        <div key={idx} className="space-y-2 rounded border p-2">
          <input
            type="text"
            placeholder="Question"
            className="w-full rounded border p-1.5 text-sm"
            value={item.question}
            onChange={(e) =>
              setProp((p: FaqProps) => {
                const list = [...(p.items ?? defaultItems)];
                list[idx] = { ...list[idx]!, question: e.target.value };
                p.items = list;
              })
            }
          />
          <textarea
            placeholder="Answer"
            rows={2}
            className="w-full rounded border p-1.5 text-sm"
            value={item.answer}
            onChange={(e) =>
              setProp((p: FaqProps) => {
                const list = [...(p.items ?? defaultItems)];
                list[idx] = { ...list[idx]!, answer: e.target.value };
                p.items = list;
              })
            }
          />
          <button
            className="text-xs text-red-500 hover:text-red-700"
            onClick={() =>
              setProp((p: FaqProps) => {
                const list = [...(p.items ?? defaultItems)];
                list.splice(idx, 1);
                p.items = list;
              })
            }
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className="w-full rounded border border-dashed px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
        onClick={() =>
          setProp((p: FaqProps) => {
            p.items = [
              ...(p.items ?? defaultItems),
              { question: 'New question?', answer: 'Answer here...' },
            ];
          })
        }
      >
        + Add Question
      </button>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

Faq.craft = {
  displayName: 'FAQ / Accordion',
  props: {
    items: defaultItems,
    title: 'Frequently Asked Questions',
    allowMultiple: false,
  },
  related: {
    settings: FaqSettings,
  },
};
