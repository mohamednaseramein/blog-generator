import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  listAdminUsers,
  listAdminBlogs,
  postAdminUserAction,
  deleteAdminBlog,
  type AdminUserRow,
  type AdminBlogRow,
} from '../../api/admin-api';
import { useAuth } from '../../context/AuthContext';

export type AdminNotice = { variant: 'error' | 'success' | 'info'; text: string } | null;

export interface AdminDashboardContextValue {
  me: string | undefined;
  user: ReturnType<typeof useAuth>['user'];
  users: AdminUserRow[];
  blogs: AdminBlogRow[];
  loading: boolean;
  notice: AdminNotice;
  setNotice: (n: AdminNotice) => void;
  load: (options?: { keepNotice?: boolean }) => Promise<void>;
  userFilter: string;
  setUserFilter: (id: string) => void;
  busyUserId: string | null;
  busyBlogId: string | null;
  runAction: (userId: string, successLabel: string, path: string) => Promise<void>;
  confirmAndRun: (userId: string, message: string, successLabel: string, path: string) => Promise<void>;
  confirmDeleteBlog: (blogId: string, titleLabel: string) => Promise<void>;
  managedUserId: string | null;
  managedUserLabel: string;
  setManagedUser: (id: string | null, label?: string) => void;
  blogCounts: Map<string, number>;
  filteredBlogs: AdminBlogRow[];
}

const AdminDashboardContext = createContext<AdminDashboardContextValue | null>(null);

export function useAdminDashboard(): AdminDashboardContextValue {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) {
    throw new Error('useAdminDashboard must be used within AdminDashboardProvider');
  }
  return ctx;
}

export function AdminDashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const me = user?.id;
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [blogs, setBlogs] = useState<AdminBlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<AdminNotice>(null);
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

  const runAction = useCallback(
    async (userId: string, successLabel: string, path: string) => {
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
    },
    [load],
  );

  const confirmAndRun = useCallback(
    async (userId: string, message: string, successLabel: string, path: string) => {
      if (!window.confirm(message)) return;
      await runAction(userId, successLabel, path);
    },
    [runAction],
  );

  const confirmDeleteBlog = useCallback(
    async (blogId: string, titleLabel: string) => {
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
    },
    [load],
  );

  const setManagedUser = useCallback((id: string | null, label = '') => {
    setManagedUserId(id);
    setManagedUserLabel(label);
  }, []);

  const value: AdminDashboardContextValue = useMemo(
    () => ({
      me,
      user,
      users,
      blogs,
      loading,
      notice,
      setNotice,
      load,
      userFilter,
      setUserFilter,
      busyUserId,
      busyBlogId,
      runAction,
      confirmAndRun,
      confirmDeleteBlog,
      managedUserId,
      managedUserLabel,
      setManagedUser,
      blogCounts,
      filteredBlogs,
    }),
    [
      me,
      user,
      users,
      blogs,
      loading,
      notice,
      load,
      userFilter,
      busyUserId,
      busyBlogId,
      runAction,
      confirmAndRun,
      confirmDeleteBlog,
      managedUserId,
      managedUserLabel,
      setManagedUser,
      blogCounts,
      filteredBlogs,
    ],
  );

  return <AdminDashboardContext.Provider value={value}>{children}</AdminDashboardContext.Provider>;
}
