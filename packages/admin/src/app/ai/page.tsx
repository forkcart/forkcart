'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Check, AlertCircle, Loader2, Eye, EyeOff, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';

interface AIStatusResponse {
  data: {
    configured: boolean;
    provider: string | null;
    model: string | null;
    availableProviders: Array<{
      id: string;
      name: string;
      defaultModel: string;
      configured: boolean;
    }>;
  };
}

interface AISettingsResponse {
  data: {
    provider: string;
    apiKey: string;
    model: string | null;
  } | null;
}

interface TestResult {
  data: {
    success: boolean;
    response?: string;
    model?: string;
    error?: string;
    usage?: { inputTokens: number; outputTokens: number };
  };
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...', defaultModel: 'gpt-4o-mini' },
  {
    id: 'anthropic',
    name: 'Anthropic',
    placeholder: 'sk-ant-...',
    defaultModel: 'claude-sonnet-4-20250514',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    placeholder: 'AIza...',
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    placeholder: 'sk-or-...',
    defaultModel: 'anthropic/claude-sonnet-4-20250514',
  },
];

export default function AISettingsPage() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<TestResult['data'] | null>(null);

  const { data: status } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => apiClient<AIStatusResponse>('/ai/status'),
  });

  const { data: settings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => apiClient<AISettingsResponse>('/ai/settings'),
  });

  // Populate form from saved settings
  useEffect(() => {
    if (settings?.data) {
      setProvider(settings.data.provider);
      setApiKey(settings.data.apiKey);
      setModel(settings.data.model ?? '');
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: { provider: string; apiKey: string; model?: string }) =>
      apiClient('/ai/settings', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-status'] });
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      setTestResult(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => apiClient<TestResult>('/ai/test', { method: 'POST' }),
    onSuccess: (data) => setTestResult(data.data),
    onError: (err) => setTestResult({ success: false, error: err.message }),
  });

  const selectedProvider = PROVIDERS.find((p) => p.id === provider);

  function handleSave() {
    saveMutation.mutate({
      provider,
      apiKey,
      model: model || undefined,
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Configure your AI provider for product descriptions and SEO generation
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Status banner */}
        {status?.data && (
          <div
            className={`flex items-center gap-3 rounded-lg border p-4 ${
              status.data.configured
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-yellow-200 bg-yellow-50 text-yellow-800'
            }`}
          >
            {status.data.configured ? (
              <>
                <Check className="h-5 w-5" />
                <span>
                  AI is active — using <strong>{status.data.provider}</strong>
                  {status.data.model && ` (${status.data.model})`}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5" />
                <span>No AI provider configured. AI features are disabled.</span>
              </>
            )}
          </div>
        )}

        {/* Configuration form */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Provider Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your own API key. ForkCart does not provide AI credits.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="provider">AI Provider</Label>
              <Select
                id="provider"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setModel('');
                  setTestResult(null);
                }}
                className="mt-1.5"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative mt-1.5">
                <Input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={selectedProvider?.placeholder ?? 'Enter API key'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="model">
                Model Override{' '}
                <span className="text-muted-foreground">
                  (optional — default: {selectedProvider?.defaultModel})
                </span>
              </Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={selectedProvider?.defaultModel}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={!apiKey || saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saveMutation.isSuccess ? 'Saved!' : 'Save Settings'}
            </button>

            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !status?.data?.configured}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Test Connection
            </button>
          </div>
        </div>

        {/* Chatbot Settings */}
        <ChatbotSettingsSection configured={!!status?.data?.configured} />

        {/* Test result */}
        {testResult && (
          <div
            className={`rounded-lg border p-4 ${
              testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <h3 className="font-semibold">
              {testResult.success ? '✅ Connection successful!' : '❌ Connection failed'}
            </h3>
            {testResult.success && (
              <div className="mt-2 text-sm">
                <p>
                  <strong>Response:</strong> {testResult.response}
                </p>
                <p>
                  <strong>Model:</strong> {testResult.model}
                </p>
                {testResult.usage && (
                  <p>
                    <strong>Tokens:</strong> {testResult.usage.inputTokens} in /{' '}
                    {testResult.usage.outputTokens} out
                  </p>
                )}
              </div>
            )}
            {testResult.error && <p className="mt-2 text-sm text-red-700">{testResult.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatbotSettings {
  enabled: boolean;
  systemPrompt: string;
  welcomeMessage: string;
}

function ChatbotSettingsSection({ configured }: { configured: boolean }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [loaded, setLoaded] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ['chatbot-settings'],
    queryFn: () => apiClient<{ data: ChatbotSettings }>('/chat/admin/settings'),
  });

  useEffect(() => {
    if (settingsData?.data && !loaded) {
      setEnabled(settingsData.data.enabled);
      setSystemPrompt(settingsData.data.systemPrompt);
      setWelcomeMessage(settingsData.data.welcomeMessage);
      setLoaded(true);
    }
  }, [settingsData, loaded]);

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
    <form onSubmit={handleSave} className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Chatbot</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered customer support widget on your storefront
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {enabled ? 'Active' : 'Inactive'}
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

      {!configured && (
        <p className="mt-4 text-sm text-yellow-700">
          Configure an AI provider above to enable the chatbot.
        </p>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Welcome Message</label>
          <input
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            placeholder="Hello! 👋 How can I help you?"
          />
        </div>

        <div>
          <label className="text-sm font-medium">System Prompt</label>
          <p className="text-xs text-muted-foreground">
            Instructions for the AI chatbot. Use {'{shopName}'} as placeholder.
          </p>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm"
            rows={8}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Chatbot Settings'}
        </button>
        {updateMutation.isSuccess && <span className="text-sm text-green-600">Saved ✓</span>}
      </div>
    </form>
  );
}
