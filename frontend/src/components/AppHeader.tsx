import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserSettingsMenu } from './UserSettingsMenu';

export function AppHeader() {
  const { user } = useAuth();
  const authState = user ? 'logged_in' : 'logged_out';
  const logoTo = authState === 'logged_in' ? '/dashboard' : '/';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to={logoTo} className="flex items-center gap-2 text-slate-900 hover:text-slate-700">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-base text-white shadow-sm">
            ✦
          </span>
          <span className="text-base font-semibold tracking-tight">AI Blog Generator</span>
        </Link>
        <UserSettingsMenu authState={authState} />
      </div>
    </header>
  );
}
