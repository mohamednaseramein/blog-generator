import { Link } from 'react-router-dom';
import { useAdminDashboard } from './admin-context';
import { Button } from '../../components/ui/button';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export default function AdminBlogsPage() {
  const { users, filteredBlogs, userFilter, setUserFilter, busyBlogId, confirmDeleteBlog, loading, load } =
    useAdminDashboard();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All blogs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Drafts and progress across every user.{' '}
            <Link to="/admin/users" className="font-medium text-indigo-600 hover:text-indigo-500">
              Open users
            </Link>
          </p>
        </div>
        <Button variant="ghost" size="sm" type="button" className="lg:hidden" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading && users.length === 0 ? (
        <p className="text-center text-slate-500">Loading blogs…</p>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">Filter the list by blog owner.</p>
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
                  <th className="px-3 py-2">View</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBlogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
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
                          <Link
                            to={`/admin/blogs/${b.id}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            Details
                          </Link>
                        </td>
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
      )}
    </div>
  );
}
