import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAdminDashboard } from './admin-context';
import { AdminUserPanel } from '../../components/AdminUserPanel';
import { AdminUserActions } from '../../components/AdminUserActions';
import { AdminUserSubscriptionPanel } from '../../components/AdminUserSubscriptionPanel';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const {
    me,
    users,
    loading,
    blogCounts,
    busyUserId,
    confirmAndRun,
    runAction,
    load,
    setUserFilter,
    setManagedUser,
    setNotice,
  } = useAdminDashboard();

  if (!userId) {
    return <Navigate to="/admin/users" replace />;
  }

  const u = users.find((row) => row.id === userId);
  const label = u?.email ?? u?.id ?? 'User';
  const blogCount = u ? (blogCounts.get(u.id) ?? 0) : 0;

  if (!u) {
    if (loading) {
      return <p className="text-center text-slate-500">Loading user…</p>;
    }
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">User not found</h1>
        <p className="mt-2 text-sm text-slate-600">No account matches this link, or the user was removed.</p>
        <Link
          to="/admin/users"
          className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Back to all users
        </Link>
      </div>
    );
  }

  const isDeactivated = Boolean(u.deactivated_at);

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/admin/users"
          className="-ml-2 mb-2 inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          ← All users
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User details</h1>
        <p className="mt-1 text-sm text-slate-600">Account metadata, administration actions, and author profiles.</p>
      </div>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Account</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-slate-500">Email</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{u.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">User ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-800">{u.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Role</dt>
            <dd className="mt-1">
              <span
                className={
                  u.role === 'admin'
                    ? 'rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800'
                    : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700'
                }
              >
                {u.role}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Sign-in status</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {isDeactivated ? <span className="text-amber-800">Deactivated</span> : <span className="text-emerald-800">Active</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Email verified</dt>
            <dd className="mt-1 text-sm text-slate-900">{fmtDate(u.email_verified_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Blogs</dt>
            <dd className="mt-1 text-sm text-slate-900">{blogCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-sm text-slate-900">{fmtDate(u.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Last sign-in</dt>
            <dd className="mt-1 text-sm text-slate-900">{fmtDate(u.last_sign_in_at)}</dd>
          </div>
          {u.deactivated_at ? (
            <div>
              <dt className="text-xs font-medium text-slate-500">Deactivated at</dt>
              <dd className="mt-1 text-sm text-slate-900">{fmtDate(u.deactivated_at)}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <AdminUserSubscriptionPanel
            userId={u.id}
            disabled={isDeactivated}
            onUpdated={() => void load({ keepNotice: true })}
          />
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Actions</h2>
          <AdminUserActions
            u={u}
            me={me}
            busyUserId={busyUserId}
            confirmAndRun={confirmAndRun}
            runAction={runAction}
            navigate={navigate}
            setUserFilter={setUserFilter}
            setManagedUser={setManagedUser}
            mode="inline"
          />
        </div>
      </section>

      <AdminUserPanel
        userId={u.id}
        userLabel={label}
        onClose={() => navigate('/admin/users')}
        onSaved={() => {
          void load({ keepNotice: true });
          setNotice({ variant: 'success', text: 'Profile saved. Lists refreshed.' });
        }}
      />
    </div>
  );
}
