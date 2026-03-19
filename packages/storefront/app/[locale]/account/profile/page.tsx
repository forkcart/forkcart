'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { LocaleLink } from '@/components/locale-link';
import { useTranslation } from '@forkcart/i18n/react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ChevronLeft, Loader2, Check } from 'lucide-react';
import { API_URL } from '@/lib/config';

export default function ProfilePage() {
  const { customer, token, updateProfile } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
    email: customer?.email ?? '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      await updateProfile(form);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t('account.profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('auth.passwordMismatch'));
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('auth.passwordMinLength'));
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/customer-auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: { message?: string } }).error?.message ??
            t('account.profile.passwordFailed'),
        );
      }

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('account.profile.passwordFailed'));
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="container-page py-12">
        <LocaleLink
          href="/account"
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" /> {t('account.backToAccount')}
        </LocaleLink>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('account.profile')}</h1>

        {/* Profile Form */}
        <form onSubmit={handleProfileSubmit} className="mt-6 max-w-lg rounded-lg border p-6">
          <h2 className="font-semibold text-gray-900">{t('account.personalInfo')}</h2>

          {profileError && (
            <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{profileError}</div>
          )}
          {profileSuccess && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <Check className="h-4 w-4" /> {t('account.profile.updated')}
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('checkout.firstName')}
                </label>
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('checkout.lastName')}
                </label>
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('auth.email')}</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('account.profile.saveChanges')}
          </button>
        </form>

        {/* Password Form */}
        <form onSubmit={handlePasswordSubmit} className="mt-8 max-w-lg rounded-lg border p-6">
          <h2 className="font-semibold text-gray-900">{t('account.changePassword')}</h2>

          {passwordError && (
            <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <Check className="h-4 w-4" /> {t('account.profile.passwordChanged')}
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                {t('account.profile.currentPassword')}
              </label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                }
                className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                {t('account.profile.newPassword')}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                {t('account.profile.confirmNewPassword')}
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="mt-4 flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('account.changePassword')}
          </button>
        </form>
      </div>
    </ProtectedRoute>
  );
}
