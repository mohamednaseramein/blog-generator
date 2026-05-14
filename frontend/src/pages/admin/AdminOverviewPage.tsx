import { Link } from 'react-router-dom';
import { useAdminDashboard } from './admin-context';

export default function AdminOverviewPage() {
  const { users, blogs, loading } = useAdminDashboard();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            View accounts, blogs, and roles.{' '}
            <Link to="/dashboard" className="font-medium text-indigo-600 hover:text-indigo-500">
              Back to app
            </Link>
          </p>
        </div>
      </div>

      {loading && users.length === 0 ? (
        <p className="text-center text-slate-500">Loading admin data…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/admin/users"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Users</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{users.length}</p>
            <p className="mt-1 text-sm text-slate-600">Manage roles, access, and profiles</p>
          </Link>
          <Link
            to="/admin/blogs"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blogs</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{blogs.length}</p>
            <p className="mt-1 text-sm text-slate-600">All drafts and published posts</p>
          </Link>
          <Link
            to="/help/ai-detector-rules"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:col-span-2 lg:col-span-1"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Help</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">AI detector rules</p>
            <p className="mt-1 text-sm text-slate-600">Rubric shown to end users</p>
          </Link>
        </div>
      )}
    </div>
  );
}
