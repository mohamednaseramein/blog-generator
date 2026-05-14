import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AdminUserPanel } from '../components/AdminUserPanel';
import { Button } from '../components/ui/button';
import { Toast } from '../components/ui/toast';
import {
  listAdminUsers,
  listAdminBlogs,
  postAdminUserAction,
  deleteAdminBlog,
  type AdminUserRow,
  type AdminBlogRow,
} from '../api/admin-api';
import { useAuth } from '../context/AuthContext';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const me = user?.id;
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [blogs, setBlogs] = useState<AdminBlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ variant: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyBlogId, setBusyBlogId] = useState<string | null>(null);
  const [managedUserId, setManagedUserId] = useState<string | null>(null);
  const [managedUserLabel, setManagedUserLabel] = useState<string>('');

  const load = useCallback(async (options?: { keepNotice?: boolean }) => {
    setLoading(true);
    if (!options?.keepNotice) {
      setNotice(null);
    }
    try {
      const [u, b] = await Promise.all([listAdminUsers(), listAdminBlogs()]);
      setUsers(u);
      setBlogs(b);
    } catch (e) {
      setNotice({ variant: 'error', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const blogCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of blogs) {
      m.set(b.user_id, (m.get(b.user_id) ?? 0) + 1);
    }
    return m;
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    if (userFilter === 'all') return blogs;
    return blogs.filter((b) => b.user_id === userFilter);
  }, [blogs, userFilter]);

  async function runAction(userId: string, successLabel: string, path: string) {
    setBusyUserId(userId);
    try {
      await postAdminUserAction(path);
      await load({ keepNotice: true });
      setNotice({ variant: 'success', text: `${successLabel}` });
    } catch (e) {
      setNotice({ variant: 'error', text: (e as Error).message });
    } finally {
      setBusyUserId(null);
    }
  }

  async function confirmAndRun(userId: string, message: string, successLabel: string, path: string) {
    if (!window.confirm(message)) return;
    await runAction(userId, successLabel, path);
  }

  async function confirmDeleteBlog(blogId: string, titleLabel: string) {
    if (
      !window.confirm(
        `Permanently delete this blog and all related data (brief, outline, draft, references, AI checks)?\n\n${titleLabel}`,
      )
    ) {
      return;
    }
    setBusyBlogId(blogId);
    try {
      await deleteAdminBlog(blogId);
      await load({ keepNotice: true });
      setNotice({ variant: 'success', text: 'Blog deleted.' });
    } catch (e) {
      setNotice({ variant: 'error', text: (e as Error).message });
    } finally {
      setBusyBlogId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              View every account and blog, adjust roles, and control access.{' '}
              <Link to="/dashboard" className="font-medium text-indigo-600 hover:text-indigo-500">
                Back to app
              </Link>
            </p>
          </div>
          <Button variant="ghost" size="sm" type="button" onClick={() => void load()} disabled={loading}>
            Refresh data
          </Button>
        </div>

        {notice && (
          <div className="mb-6">
            <Toast variant={notice.variant}>{notice.text}</Toast>
          </div>
        )}

        {loading && users.length === 0 ? (
          <p className="text-center text-slate-500">Loading admin data…</p>
        ) : (
          <>
            <section className="mb-12 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">Users and roles</h2>
              <p className="mb-4 text-sm text-slate-600">
                Promote or demote administrators, deactivate or reactivate sign-in, or send a password reset email.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <caption className="sr-only">Registered users and administration actions</caption>
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2">Blogs</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Last sign-in</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isDeactivated = Boolean(u.deactivated_at);
                      const blogCount = blogCounts.get(u.id) ?? 0;
                      const busy = busyUserId === u.id;
                      const label = u.email ?? u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">{label}</td>
                          <td className="px-3 py-3">
                            <span
                              className={
                                u.role === 'admin'
                                  ? 'rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800'
                                  : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700'
                              }
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {isDeactivated ? (
                              <span className="text-amber-800">Deactivated</span>
                            ) : (
                              <span className="text-emerald-800">Active</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-600">{blogCount}</td>
                          <td className="px-3 py-3 text-slate-600">{fmtDate(u.created_at)}</td>
                          <td className="px-3 py-3 text-slate-600">{fmtDate(u.last_sign_in_at)}</td>
                          <td className="px-3 py-3">
                            <div className="flex max-w-md flex-wrap gap-1">
                              {u.role !== 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  className="text-indigo-700"
                                  type="button"
                                  onClick={() =>
                                    void confirmAndRun(
                                      u.id,
                                      `Grant admin access to ${label}?`,
                                      'User promoted to admin.',
                                      `/users/${u.id}/promote`,
                                    )
                                  }
                                >
                                  Make admin
                                </Button>
                              )}
                              {u.role === 'admin' && u.id !== me && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  className="text-slate-700"
                                  type="button"
                                  onClick={() =>
                                    void confirmAndRun(
                                      u.id,
                                      `Remove admin role from ${label}?`,
                                      'Admin role removed.',
                                      `/users/${u.id}/demote`,
                                    )
                                  }
                                >
                                  Remove admin
                                </Button>
                              )}
                              {!isDeactivated && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  className="text-amber-900"
                                  type="button"
                                  onClick={() =>
                                    void confirmAndRun(
                                      u.id,
                                      `Deactivate ${label}? They will not be able to sign in until reactivated.`,
                                      'Account deactivated.',
                                      `/users/${u.id}/deactivate`,
                                    )
                                  }
                                >
                                  Deactivate
                                </Button>
                              )}
                              {isDeactivated && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  className="text-emerald-800"
                                  type="button"
                                  onClick={() => void runAction(u.id, 'Account reactivated.', `/users/${u.id}/reactivate`)}
                                >
                                  Reactivate
                                </Button>
                              )}
                              {u.email ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  type="button"
                                  onClick={() =>
                                    void confirmAndRun(
                                      u.id,
                                      `Send password reset email to ${u.email}?`,
                                      'Password reset email sent.',
                                      `/users/${u.id}/force-reset`,
                                    )
                                  }
                                >
                                  Reset password email
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                className="text-indigo-600"
                                onClick={() => setUserFilter(u.id)}
                              >
                                Filter blogs
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                className="font-medium text-indigo-800"
                                onClick={() => {
                                  setManagedUserId(u.id);
                                  setManagedUserLabel(label);
                                  setUserFilter(u.id);
                                }}
                              >
                                Usage & profiles
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {managedUserId && (
              <AdminUserPanel
                userId={managedUserId}
                userLabel={managedUserLabel}
                onClose={() => setManagedUserId(null)}
                onSaved={() => {
                  void load({ keepNotice: true });
                  setNotice({ variant: 'success', text: 'Profile saved. Lists refreshed.' });
                }}
              />
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">All blogs</h2>
                  <p className="text-sm text-slate-600">Drafts and progress across every user.</p>
                </div>
                <label className="flex flex-col gap-1 text-sm text-slate-700 sm:flex-row sm:items-center sm:gap-2">
                  <span className="whitespace-nowrap">Filter by owner</span>
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                  >
                    <option value="all">All users</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email ?? u.id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <caption className="sr-only">Blog drafts across all accounts</caption>
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Step</th>
                      <th className="px-3 py-2">Updated</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBlogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                          No blogs for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBlogs.map((b) => {
                        const titleLabel = b.title ?? '(no title yet)';
                        const busy = busyBlogId === b.id;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/80">
                            <td className="max-w-xs truncate px-3 py-3 font-medium text-slate-900" title={b.title ?? undefined}>
                              {titleLabel}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-slate-600">{b.owner_email}</td>
                            <td className="px-3 py-3">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{b.status}</span>
                            </td>
                            <td className="px-3 py-3 text-slate-600">{b.current_step}</td>
                            <td className="px-3 py-3 text-slate-600">{fmtDate(b.updated_at)}</td>
                            <td className="px-3 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                disabled={busy}
                                className="text-red-700 hover:bg-red-50"
                                onClick={() => void confirmDeleteBlog(b.id, titleLabel)}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
