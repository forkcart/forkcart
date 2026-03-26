'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';

export interface ContactFormProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  showPhone?: boolean;
  showSubject?: boolean;
  backgroundColor?: string;
  className?: string;
}

export const ContactForm: UserComponent<ContactFormProps> = ({
  title = 'Get in Touch',
  subtitle = 'We would love to hear from you. Send us a message and we will respond as soon as possible.',
  buttonText = 'Send Message',
  showPhone = false,
  showSubject = true,
  backgroundColor = '#ffffff',
  className,
}) => {
  const {
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <StyledBlock className={cn('mx-auto w-full max-w-2xl px-6 py-16', className)}>
      <section style={{ backgroundColor }}>
        {title && (
          <h2
            className={cn(
              'mb-2 text-center text-2xl font-bold text-gray-900 outline-none',
              selected && 'cursor-text rounded ring-1 ring-emerald-300 ring-offset-1',
            )}
            contentEditable={selected}
            suppressContentEditableWarning
            onBlur={(e) =>
              setProp((p: ContactFormProps) => (p.title = e.currentTarget.textContent ?? ''))
            }
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p
            className={cn(
              'mb-8 text-center text-gray-500 outline-none',
              selected && 'cursor-text rounded ring-1 ring-emerald-300 ring-offset-1',
            )}
            contentEditable={selected}
            suppressContentEditableWarning
            onBlur={(e) =>
              setProp((p: ContactFormProps) => (p.subtitle = e.currentTarget.textContent ?? ''))
            }
          >
            {subtitle}
          </p>
        )}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            alert('Contact form submitted (frontend-only demo)');
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="you@example.com"
              />
            </div>
          </div>
          {showPhone && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          )}
          {showSubject && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
              <input
                type="text"
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="How can we help?"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
            <textarea
              rows={5}
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Your message..."
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            {buttonText}
          </button>
        </form>
      </section>
    </StyledBlock>
  );
};

function ContactFormSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as ContactFormProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.title ?? 'Get in Touch'}
          onChange={(e) => setProp((p: ContactFormProps) => (p.title = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Subtitle</label>
        <textarea
          rows={2}
          className="w-full rounded border p-2 text-sm"
          value={props.subtitle ?? ''}
          onChange={(e) => setProp((p: ContactFormProps) => (p.subtitle = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Button Text</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.buttonText ?? 'Send Message'}
          onChange={(e) => setProp((p: ContactFormProps) => (p.buttonText = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={props.showPhone ?? false}
            onChange={(e) => setProp((p: ContactFormProps) => (p.showPhone = e.target.checked))}
          />
          Show Phone Field
        </label>
      </div>
      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={props.showSubject ?? true}
            onChange={(e) => setProp((p: ContactFormProps) => (p.showSubject = e.target.checked))}
          />
          Show Subject Field
        </label>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Background Color</label>
        <input
          type="color"
          className="h-10 w-full rounded border"
          value={props.backgroundColor ?? '#ffffff'}
          onChange={(e) => setProp((p: ContactFormProps) => (p.backgroundColor = e.target.value))}
        />
      </div>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

ContactForm.craft = {
  displayName: 'Contact Form',
  props: {
    title: 'Get in Touch',
    subtitle:
      'We would love to hear from you. Send us a message and we will respond as soon as possible.',
    buttonText: 'Send Message',
    showPhone: false,
    showSubject: true,
    backgroundColor: '#ffffff',
  },
  related: {
    settings: ContactFormSettings,
  },
};
