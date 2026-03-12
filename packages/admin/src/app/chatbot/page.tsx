'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Eye, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

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

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () =>
      apiClient<{ data: ChatSessionSummary[]; pagination: { total: number } }>(
        '/chat/admin/sessions?limit=50',
      ),
  });

  const { data: sessionDetail } = useQuery({
    queryKey: ['chat-session-detail', expandedSession],
    queryFn: () =>
      apiClient<{ data: ChatSessionDetail }>(`/chat/admin/sessions/${expandedSession}`),
    enabled: !!expandedSession,
  });

  const sessions = sessionsData?.data ?? [];

  return (
    <div>
      <div className="flex items-center gap-3">
        <MessageCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Chat Sessions</h1>
          <p className="mt-1 text-muted-foreground">
            View customer chat conversations.{' '}
            <a href="/ai" className="text-primary hover:underline">
              Chatbot settings →
            </a>
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading sessions...</div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No chat sessions yet.</div>
        )}

        {sessions.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Session</th>
                <th className="p-4 font-medium">Messages</th>
                <th className="p-4 font-medium">Last Message</th>
                <th className="p-4 font-medium">Actions</th>
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
  const dateStr = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
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
                        : 'border bg-white shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="mt-1 text-xs opacity-60">
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', {
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
