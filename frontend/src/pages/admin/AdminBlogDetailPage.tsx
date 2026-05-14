import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
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

export default function AdminBlogDetailPage() {
  const { blogId } = useParams<{ blogId: string }>();
  const navigate = useNavigate();
  const { blogs, loading, busyBlogId, confirmDeleteBlog, setUserFilter } = useAdminDashboard();

  if (!blogId) {
    return <Navigate to="/admin/blogs" replace />;
  }

  const b = blogs.find((row) => row.id === blogId);
  const titleLabel = b?.title ?? '(no title yet)';

  if (!b) {
    if (loading) {
      return <p className="text-center text-slate-500">Loading blog…</p>;
    }
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Blog not found</h1>
        <p className="mt-2 text-sm text-slate-600">This draft may have been deleted or the link is invalid.</p>
        <Link to="/admin/blogs" className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Back to all blogs
        </Link>
      </div>
    );
  }

  const blog = b;
  const busy = busyBlogId === blog.id;

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/admin/blogs"
          className="-ml-2 mb-2 inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          ← All blogs
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Blog details</h1>
        <p className="mt-1 text-sm text-slate-600">Draft metadata, owner, and administration actions.</p>
      </div>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Draft</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-500">Title</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{titleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Blog ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-800">{blog.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Status</dt>
            <dd className="mt-1">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{blog.status}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Wizard step</dt>
            <dd className="mt-1 text-sm text-slate-900">{blog.current_step}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Owner email</dt>
            <dd className="mt-1 text-sm text-slate-900">{blog.owner_email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Owner user ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-800">{blog.user_id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-sm text-slate-900">{fmtDate(blog.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Updated</dt>
            <dd className="mt-1 text-sm text-slate-900">{fmtDate(blog.updated_at)}</dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Actions</h2>
          <div className="flex max-w-xl flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={busy}
              className="text-red-700 hover:bg-red-50"
              onClick={async () => {
                const deleted = await confirmDeleteBlog(blog.id, titleLabel);
                if (deleted) {
                  navigate('/admin/blogs');
                }
              }}
            >
              Delete blog
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="text-indigo-600"
              onClick={() => {
                setUserFilter(blog.user_id);
                navigate('/admin/blogs');
              }}
            >
              Filter blogs by this owner
            </Button>
            <Link
              to={`/admin/users/${blog.user_id}`}
              className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-indigo-800 hover:bg-indigo-50"
            >
              Open owner account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
