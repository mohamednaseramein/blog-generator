import { Link } from 'react-router-dom';
import { BookOpen, PenLine, Settings, UserCircle, Users } from 'lucide-react';

export type WorkspaceNavKey = 'write' | 'my-blogs' | 'author-profiles' | 'account' | 'admin';

export function workspaceNavClass(active: boolean) {
  return [
    'flex w-full shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
    active ? 'bg-indigo-100 text-indigo-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

interface DashboardNavProps {
  mode: 'dashboard';
  active: WorkspaceNavKey;
  showAdmin: boolean;
  onWrite: () => void;
  onMyBlogs: () => void;
  onAuthorProfiles: () => void;
}

interface RouterNavProps {
  mode: 'router';
  active: WorkspaceNavKey;
  showAdmin: boolean;
}

type WorkspaceSidebarProps = DashboardNavProps | RouterNavProps;

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const { showAdmin } = props;
  const writeActive = props.active === 'write';
  const blogsActive = props.active === 'my-blogs';
  const profilesActive = props.active === 'author-profiles';
  const accountActive = props.active === 'account';
  const adminActive = props.active === 'admin';

  return (
    <aside
      className="shrink-0 border-b border-slate-200 bg-white/70 pb-4 backdrop-blur-sm lg:w-52 lg:border-b-0 lg:border-r lg:border-slate-200 lg:bg-transparent lg:pb-0 lg:pr-2"
      aria-label="Workspace navigation"
    >
      <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
        Workspace
      </p>
      <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
        {props.mode === 'dashboard' ? (
          <>
            <button type="button" className={workspaceNavClass(writeActive)} onClick={props.onWrite}>
              <PenLine className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Write
            </button>
            <button type="button" className={workspaceNavClass(blogsActive)} onClick={props.onMyBlogs}>
              <BookOpen className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              My blogs
            </button>
            <button type="button" className={workspaceNavClass(profilesActive)} onClick={props.onAuthorProfiles}>
              <Users className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Author profiles
            </button>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`${workspaceNavClass(writeActive)} no-underline`}>
              <PenLine className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Write
            </Link>
            <Link to="/dashboard" state={{ open: 'history' }} className={`${workspaceNavClass(blogsActive)} no-underline`}>
              <BookOpen className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              My blogs
            </Link>
            <Link to="/dashboard" state={{ open: 'profiles' }} className={`${workspaceNavClass(profilesActive)} no-underline`}>
              <Users className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Author profiles
            </Link>
          </>
        )}

        <Link to="/profile" className={`${workspaceNavClass(accountActive)} no-underline`}>
          <UserCircle className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          Account
        </Link>
        {showAdmin && (
          <Link to="/admin" className={`${workspaceNavClass(adminActive)} no-underline`}>
            <Settings className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Admin
          </Link>
        )}
      </nav>
    </aside>
  );
}
