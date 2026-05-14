import { LayoutDashboard, Users, BookOpen, Layers } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/ui/button';
import { Toast } from '../../components/ui/toast';
import { AdminDashboardProvider, useAdminDashboard } from './admin-context';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-indigo-100 text-indigo-900'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');

function AdminLayoutInner() {
  const { notice, load, loading } = useAdminDashboard();
  const iconClass = 'h-4 w-4 shrink-0 opacity-80';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <AppHeader />
      <div className="mx-auto flex max-w-7xl flex-col gap-0 lg:flex-row lg:items-start">
        <aside
          className="shrink-0 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-sm lg:w-56 lg:border-b-0 lg:border-r lg:py-8"
          aria-label="Admin navigation"
        >
          <p className="mb-3 hidden text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
            Admin
          </p>
          <nav className="flex flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
            <NavLink to="/admin" end className={navLinkClass}>
              <LayoutDashboard className={iconClass} aria-hidden />
              Overview
            </NavLink>
            <NavLink to="/admin/users" className={navLinkClass}>
              <Users className={iconClass} aria-hidden />
              Users
            </NavLink>
            <NavLink to="/admin/blogs" className={navLinkClass}>
              <BookOpen className={iconClass} aria-hidden />
              Blogs
            </NavLink>
            <NavLink to="/admin/plans" className={navLinkClass}>
              <Layers className={iconClass} aria-hidden />
              Plans
            </NavLink>
          </nav>
          <div className="mt-6 hidden border-t border-slate-100 pt-4 lg:block">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="w-full justify-start"
            >
              Refresh data
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {notice && (
            <div className="mb-6">
              <Toast variant={notice.variant}>{notice.text}</Toast>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminDashboardProvider>
      <AdminLayoutInner />
    </AdminDashboardProvider>
  );
}
