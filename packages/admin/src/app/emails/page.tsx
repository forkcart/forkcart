'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Mail, Send, Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface EmailLogEntry {
  id: string;
  provider: string;
  to: string;
  subject: string;
  template: string;
  messageId: string;
  status: string;
  sentAt: string;
}

export default function EmailsPage() {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await apiClient<{ data: EmailLogEntry[] }>('/emails/log');
      setLogs(res.data);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load email log',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function handleSendTest() {
    if (!testEmail) return;
    setSending(true);
    setMessage(null);

    try {
      await apiClient('/emails/test', {
        method: 'POST',
        body: JSON.stringify({ to: testEmail }),
      });
      setMessage({ type: 'success', text: `Test email sent to ${testEmail}` });
      setTestEmail('');
      await fetchLogs();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send test email',
      });
    } finally {
      setSending(false);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function templateLabel(template: string): string {
    const labels: Record<string, string> = {
      'order-confirmation': 'Order Confirmation',
      'order-shipped': 'Order Shipped',
      'order-delivered': 'Order Delivered',
      welcome: 'Welcome',
      'password-reset': 'Password Reset',
      raw: 'Test / Custom',
    };
    return labels[template] ?? template;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Emails</h1>
          <p className="mt-1 text-muted-foreground">Send test emails and view the email log</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchLogs();
          }}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-md p-4 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-xs underline">
            dismiss
          </button>
        </div>
      )}

      {/* Test Email Section */}
      <div className="mt-8 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Send className="h-5 w-5 text-muted-foreground" />
          Send Test Email
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify your email provider is working correctly.
        </p>
        <div className="mt-4 flex gap-3">
          <Input
            type="email"
            placeholder="recipient@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendTest();
            }}
            className="max-w-sm"
          />
          <button
            onClick={handleSendTest}
            disabled={sending || !testEmail}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Test
          </button>
        </div>
      </div>

      {/* Email Log Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Email Log
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {logs.length}
          </span>
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading email log...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No emails sent yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Emails will appear here once sent via order events or the test function.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Template
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sent
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {entry.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.to}</td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.subject}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {templateLabel(entry.template)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{entry.provider}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(entry.sentAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
