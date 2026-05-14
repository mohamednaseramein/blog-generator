import type { NavigateFunction } from 'react-router-dom';
import type { AdminUserRow } from '../api/admin-api';
import { Button } from './ui/button';

export type AdminUserActionsMode = 'overlay' | 'inline';

export interface AdminUserActionsProps {
  u: AdminUserRow;
  me: string | undefined;
  busyUserId: string | null;
  confirmAndRun: (userId: string, message: string, successLabel: string, path: string) => Promise<void>;
  runAction: (userId: string, successLabel: string, path: string) => Promise<void>;
  navigate: NavigateFunction;
  setUserFilter: (id: string) => void;
  setManagedUser: (id: string | null, label?: string) => void;
  /** List page opens the slide-down panel; detail page scrolls to usage & profiles. */
  mode?: AdminUserActionsMode;
}

const PROFILES_SECTION_ID = 'admin-user-profiles';

export function AdminUserActions({
  u,
  me,
  busyUserId,
  confirmAndRun,
  runAction,
  navigate,
  setUserFilter,
  setManagedUser,
  mode = 'overlay',
}: AdminUserActionsProps) {
  const isDeactivated = Boolean(u.deactivated_at);
  const busy = busyUserId === u.id;
  const label = u.email ?? u.id;

  function openUsageProfiles() {
    if (mode === 'inline') {
      document.getElementById(PROFILES_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setManagedUser(u.id, label);
    setUserFilter(u.id);
  }

  return (
    <div className="flex max-w-2xl flex-wrap gap-1">
      {u.role !== 'admin' && (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="text-indigo-700"
          type="button"
          onClick={() =>
            void confirmAndRun(u.id, `Grant admin access to ${label}?`, 'User promoted to admin.', `/users/${u.id}/promote`)
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
            void confirmAndRun(u.id, `Remove admin role from ${label}?`, 'Admin role removed.', `/users/${u.id}/demote`)
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
        onClick={() => {
          setUserFilter(u.id);
          navigate('/admin/blogs');
        }}
      >
        Filter blogs
      </Button>
      <Button variant="ghost" size="sm" type="button" className="font-medium text-indigo-800" onClick={openUsageProfiles}>
        Usage & profiles
      </Button>
    </div>
  );
}

export { PROFILES_SECTION_ID };
