'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Check, X, Download, Loader2, Globe, Pencil } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface TaxClass {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface TaxZone {
  id: string;
  name: string;
  countries: string[];
}

interface TaxRule {
  id: string;
  name: string;
  taxClassId: string | null;
  taxZoneId: string | null;
  country: string | null;
  state: string | null;
  rate: string;
  priority: number;
  taxType: string;
  isCompound: boolean;
  isDefault: boolean;
  isActive: boolean;
  taxClass?: TaxClass | null;
  taxZone?: TaxZone | null;
}

const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'DE', name: 'Germany' },
  { code: 'AT', name: 'Austria' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'RO', name: 'Romania' },
  { code: 'HU', name: 'Hungary' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LV', name: 'Latvia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MT', name: 'Malta' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'GR', name: 'Greece' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'NO', name: 'Norway' },
];

export default function TaxClassDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const classId = params.id as string;

  const [editName, setEditName] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    country: '',
    state: '',
    rate: '',
    priority: '0',
    taxType: 'VAT',
    isCompound: false,
    isDefault: false,
  });

  // Fetch tax class
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['tax-class', classId],
    queryFn: () => apiClient<{ data: TaxClass }>(`/tax/classes/${classId}`),
    enabled: !!classId,
  });

  // Fetch rules for this class
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['tax-rules', classId],
    queryFn: () => apiClient<{ data: TaxRule[] }>(`/tax/rules?taxClassId=${classId}`),
    enabled: !!classId,
  });

  // Fetch zones (for zone display)
  const { data: zonesData } = useQuery({
    queryKey: ['tax-zones'],
    queryFn: () => apiClient<{ data: TaxZone[] }>('/tax/zones'),
  });

  const taxClass = classData?.data;
  const rules = rulesData?.data ?? [];
  const zones = zonesData?.data ?? [];

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: (input: { name?: string; description?: string }) =>
      apiClient(`/tax/classes/${classId}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-class', classId] });
      setEditName(false);
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient('/tax/rules', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules', classId] });
      setShowAddForm(false);
      resetForm();
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      apiClient(`/tax/rules/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules', classId] });
      setEditingRuleId(null);
      resetForm();
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/tax/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-rules', classId] }),
  });

  function resetForm() {
    setRuleForm({
      name: '',
      country: '',
      state: '',
      rate: '',
      priority: '0',
      taxType: 'VAT',
      isCompound: false,
      isDefault: false,
    });
  }

  function startEdit(rule: TaxRule) {
    setEditingRuleId(rule.id);
    setRuleForm({
      name: rule.name,
      country: rule.country ?? '',
      state: rule.state ?? '',
      rate: (parseFloat(rule.rate) * 100).toFixed(1),
      priority: rule.priority.toString(),
      taxType: rule.taxType,
      isCompound: rule.isCompound,
      isDefault: rule.isDefault,
    });
    setShowAddForm(false);
  }

  function handleSubmit() {
    // Find or create zone for country
    const zoneId = ruleForm.country
      ? zones.find((z) => (z.countries as string[]).includes(ruleForm.country))?.id
      : undefined;

    const payload = {
      name: ruleForm.name,
      taxClassId: classId,
      taxZoneId: zoneId ?? null,
      country: ruleForm.country || null,
      state: ruleForm.state || null,
      rate: (parseFloat(ruleForm.rate) / 100).toString(),
      priority: parseInt(ruleForm.priority, 10),
      taxType: ruleForm.taxType,
      isCompound: ruleForm.isCompound,
      isDefault: ruleForm.isDefault,
      isActive: true,
    };

    if (editingRuleId) {
      updateRuleMutation.mutate({ id: editingRuleId, input: payload });
    } else {
      createRuleMutation.mutate(payload);
    }
  }

  async function handleImportEU() {
    if (
      !confirm(
        'Import EU standard VAT rates? This will create zones and rules for all 27 EU countries.',
      )
    )
      return;
    setImporting(true);
    try {
      await apiClient(`/tax/classes/${classId}/import-eu-rates`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['tax-rules', classId] });
      queryClient.invalidateQueries({ queryKey: ['tax-zones'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function formatRate(rate: string): string {
    return `${(parseFloat(rate) * 100).toFixed(1)}%`;
  }

  function getCountryName(code: string | null): string {
    if (!code) return '—';
    return COUNTRIES.find((c) => c.code === code)?.name ?? code;
  }

  if (classLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!taxClass) {
    return <div className="p-8 text-center text-muted-foreground">Tax class not found.</div>;
  }

  // Initialize form on first load
  if (!editName && name === '' && taxClass) {
    setName(taxClass.name);
    setDescription(taxClass.description ?? '');
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tax" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          {editName ? (
            <div className="flex items-center gap-2">
              <input
                className="rounded border px-3 py-1 text-2xl font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <button
                onClick={() => updateClassMutation.mutate({ name, description })}
                className="text-green-600 hover:text-green-800"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setEditName(false);
                  setName(taxClass.name);
                  setDescription(taxClass.description ?? '');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{taxClass.name}</h1>
              <button
                onClick={() => setEditName(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {taxClass.isDefault && (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Default
                </span>
              )}
            </div>
          )}
          {editName ? (
            <input
              className="mt-1 w-full max-w-md rounded border px-3 py-1 text-sm"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          ) : (
            <p className="mt-1 text-muted-foreground">{taxClass.description || 'No description'}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingRuleId(null);
            resetForm();
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Tax Rate
        </button>
        <button
          onClick={handleImportEU}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {importing ? 'Importing...' : 'Import EU Standard Rates'}
        </button>
      </div>

      {/* Rules Table */}
      <div className="mt-6 rounded-lg border bg-card shadow-sm">
        {rulesLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading tax rates...</div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="p-4">Name</th>
              <th className="p-4">Country</th>
              <th className="p-4">State/Region</th>
              <th className="p-4">Rate %</th>
              <th className="p-4">Type</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Flags</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Inline Add/Edit Form */}
            {(showAddForm || editingRuleId) && (
              <tr className="border-b bg-muted/30">
                <td className="p-4">
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="e.g. Germany VAT"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <select
                    className="w-full rounded border px-2 py-1 text-sm"
                    value={ruleForm.country}
                    onChange={(e) => setRuleForm({ ...ruleForm, country: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="Optional"
                    value={ruleForm.state}
                    onChange={(e) => setRuleForm({ ...ruleForm, state: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    className="w-20 rounded border px-2 py-1 text-sm"
                    placeholder="19.0"
                    value={ruleForm.rate}
                    onChange={(e) => setRuleForm({ ...ruleForm, rate: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    className="w-20 rounded border px-2 py-1 text-sm"
                    value={ruleForm.taxType}
                    onChange={(e) => setRuleForm({ ...ruleForm, taxType: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    className="w-16 rounded border px-2 py-1 text-sm"
                    type="number"
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({ ...ruleForm, priority: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={ruleForm.isCompound}
                      onChange={(e) => setRuleForm({ ...ruleForm, isCompound: e.target.checked })}
                    />
                    Compound
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={ruleForm.isDefault}
                      onChange={(e) => setRuleForm({ ...ruleForm, isDefault: e.target.checked })}
                    />
                    Default
                  </label>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={handleSubmit}
                    disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                    className="mr-2 text-green-600 hover:text-green-800"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingRuleId(null);
                      resetForm();
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            )}

            {/* Existing Rules */}
            {rules.map((rule) =>
              editingRuleId === rule.id ? null : (
                <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{rule.name}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      {getCountryName(rule.country)}
                      {rule.country && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                          {rule.country}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{rule.state || '—'}</td>
                  <td className="p-4">
                    <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      {formatRate(rule.rate)}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{rule.taxType}</td>
                  <td className="p-4 text-sm">{rule.priority}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {rule.isDefault && (
                        <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">
                          Default
                        </span>
                      )}
                      {rule.isCompound && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800">
                          Compound
                        </span>
                      )}
                      {!rule.isActive && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => startEdit(rule)}
                      className="mr-2 text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${rule.name}"?`)) deleteMutation.mutate(rule.id);
                      }}
                      className="text-destructive hover:text-destructive/80"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ),
            )}

            {!rulesLoading && rules.length === 0 && !showAddForm && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No tax rates yet. Add one or import EU standard rates.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
