'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Key } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLES = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
] as const;

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser, hasRole } = useAuth();

  const userId = params.id as string;
  const isNew = userId === 'new';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => apiClient<{ data: UserDetail }>(`/users/${userId}`),
    enabled: !isNew && hasRole('superadmin'),
  });

  const user = data?.data;
  const isSelf = user?.id === currentUser?.id;

  // Populate form when data loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setRole(user.role);
      setIsActive(user.isActive);
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return apiClient('/users', {
          method: 'POST',
          body: JSON.stringify({ firstName, lastName, email, role, password, isActive }),
        });
      }
      return apiClient(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ firstName, lastName, email, role, isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (isNew) {
        router.push('/users');
      } else {
        setSuccess('User updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      apiClient(`/users/${userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      }),
    onSuccess: () => {
      setNewPassword('');
      setShowPasswordSection(false);
      setSuccess('Password changed successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    },
  });

  if (!hasRole('superadmin')) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {isNew ? 'Create User' : 'Edit User'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="rounded-lg border bg-card p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isSelf}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {isSelf && (
              <p className="mt-1 text-xs text-muted-foreground">You cannot change your own role.</p>
            )}
          </div>

          {isNew && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                placeholder="Min. 8 characters"
                className="mt-1.5"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSelf}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:opacity-50" />
            </label>
            <span className="text-sm font-medium">
              {isActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </span>
            {isSelf && (
              <span className="text-xs text-muted-foreground">
                You cannot deactivate your own account.
              </span>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving…' : isNew ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section (edit mode only) */}
      {!isNew && (
        <div className="mt-6 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Change Password</h3>
              <p className="text-sm text-muted-foreground">Set a new password for this user.</p>
            </div>
            {!showPasswordSection && (
              <button
                onClick={() => setShowPasswordSection(true)}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <Key className="h-4 w-4" />
                Change Password
              </button>
            )}
          </div>
          {showPasswordSection && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                passwordMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  placeholder="Min. 8 characters"
                  className="mt-1.5"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordSection(false);
                    setNewPassword('');
                  }}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {passwordMutation.isPending ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
