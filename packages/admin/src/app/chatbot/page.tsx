'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Eye, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ChatbotSettings {
  enabled: boolean;
  systemPrompt: string;
  welcomeMessage: string;
}

interface ChatSessionSummary {
  id: string;
  sessionId: string | null;
  customerId: string | null;
  messageCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatSessionDetail {
  id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    products?: Array<{ name: string; price: number }>;
  }>;
}

export default function ChatbotPage() {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Load settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['chatbot-settings'],
    queryFn: () => apiClient<{ data: ChatbotSettings }>('/chat/admin/settings'),
  });

  // Load sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () =>
      apiClient<{ data: ChatSessionSummary[]; pagination: { total: number } }>(
        '/chat/admin/sessions?limit=50',
      ),
  });

  // Load session detail when expanded
  const { data: sessionDetail } = useQuery({
    queryKey: ['chat-session-detail', expandedSession],
    queryFn: () =>
      apiClient<{ data: ChatSessionDetail }>(`/chat/admin/sessions/${expandedSession}`),
    enabled: !!expandedSession,
  });

  const settings = settingsData?.data;
  const sessions = sessionsData?.data ?? [];

  return (
    <div>
      <div className="flex items-center gap-3">
        <MessageCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Chatbot</h1>
          <p className="mt-1 text-muted-foreground">Configure AI customer support chatbot</p>
        </div>
      </div>

      {/* Settings Section */}
      <div className="mt-8">
        {settingsLoading ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Loading settings...
          </div>
        ) : settings ? (
          <ChatbotSettingsForm settings={settings} />
        ) : null}
      </div>

      {/* Sessions Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Chat-Sessions</h2>
        <div className="mt-4 rounded-lg border bg-card shadow-sm">
          {sessionsLoading && (
            <div className="p-8 text-center text-muted-foreground">Loading sessions...</div>
          )}

          {!sessionsLoading && sessions.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No chat sessions yet.</div>
          )}

          {sessions.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Datum</th>
                  <th className="p-4 font-medium">Session</th>
                  <th className="p-4 font-medium">Nachrichten</th>
                  <th className="p-4 font-medium">Letzte Nachricht</th>
                  <th className="p-4 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    isExpanded={expandedSession === session.id}
                    detail={expandedSession === session.id ? sessionDetail?.data : undefined}
                    onToggle={() =>
                      setExpandedSession(expandedSession === session.id ? null : session.id)
                    }
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatbotSettingsForm({ settings }: { settings: ChatbotSettings }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage);

  const updateMutation = useMutation({
    mutationFn: (input: Partial<ChatbotSettings>) =>
      apiClient('/chat/admin/settings', { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-settings'] });
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({ enabled, systemPrompt, welcomeMessage });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Settings</h2>
        <label className="flex cursor-pointer items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {enabled ? 'Aktiv' : 'Inaktiv'}
          </span>
          <div
            className={`relative h-6 w-11 rounded-full transition-colors ${
              enabled ? 'bg-primary' : 'bg-gray-300'
            }`}
            onClick={() => setEnabled(!enabled)}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </label>
      </div>

      <div>
        <label className="text-sm font-medium">Willkommensnachricht</label>
        <input
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
          placeholder="Hallo! 👋 Wie kann ich dir helfen?"
        />
      </div>

      <div>
        <label className="text-sm font-medium">System Prompt</label>
        <p className="text-xs text-muted-foreground">
          Anweisungen für den AI Chatbot. Verwende {'{shopName}'} als Platzhalter.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm"
          rows={10}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      {updateMutation.isSuccess && <p className="text-sm text-green-600">Settings saved ✓</p>}
    </form>
  );
}

function SessionRow({
  session,
  isExpanded,
  detail,
  onToggle,
}: {
  session: ChatSessionSummary;
  isExpanded: boolean;
  detail?: ChatSessionDetail;
  onToggle: () => void;
}) {
  const date = new Date(session.createdAt);
  const dateStr = date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <tr className="border-b hover:bg-muted/50">
        <td className="p-4 text-sm">{dateStr}</td>
        <td className="p-4">
          <span className="font-mono text-xs text-muted-foreground">
            {session.sessionId?.slice(0, 20) ?? session.id.slice(0, 8)}...
          </span>
        </td>
        <td className="p-4">
          <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            {session.messageCount}
          </span>
        </td>
        <td className="max-w-xs truncate p-4 text-sm text-muted-foreground">
          {session.lastMessage ?? '—'}
        </td>
        <td className="p-4">
          <button
            onClick={onToggle}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </td>
      </tr>
      {isExpanded && detail && (
        <tr>
          <td colSpan={5} className="bg-muted/30 p-4">
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {(detail.messages ?? []).map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white border shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="mt-1 text-xs opacity-60">
                      {new Date(msg.timestamp).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
