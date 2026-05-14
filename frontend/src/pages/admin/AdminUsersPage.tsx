import { Link, useNavigate } from 'react-router-dom';
import { useAdminDashboard } from './admin-context';
import { AdminUserPanel } from '../../components/AdminUserPanel';
import { AdminUserActions } from '../../components/AdminUserActions';
import { Button } from '../../components/ui/button';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export default function AdminUsersPage() {
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
    managedUserId,
    managedUserLabel,
  } = useAdminDashboard();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users and roles</h1>
        <p className="mt-1 text-sm text-slate-600">
          Promote or demote administrators, deactivate or reactivate sign-in, or send a password reset email.
        </p>
      </div>

      {loading && users.length === 0 ? (
        <p className="text-center text-slate-500">Loading users…</p>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex justify-end lg:hidden">
            <Button variant="ghost" size="sm" type="button" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
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
                  <th className="px-3 py-2">View</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isDeactivated = Boolean(u.deactivated_at);
                  const blogCount = blogCounts.get(u.id) ?? 0;
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
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          Details
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <AdminUserActions
                          u={u}
                          me={me}
                          busyUserId={busyUserId}
                          confirmAndRun={confirmAndRun}
                          runAction={runAction}
                          navigate={navigate}
                          setUserFilter={setUserFilter}
                          setManagedUser={setManagedUser}
                          mode="overlay"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {managedUserId && (
        <AdminUserPanel
          userId={managedUserId}
          userLabel={managedUserLabel}
          onClose={() => setManagedUser(null)}
          onSaved={() => {
            void load({ keepNotice: true });
            setNotice({ variant: 'success', text: 'Profile saved. Lists refreshed.' });
          }}
        />
      )}
    </div>
  );
}
