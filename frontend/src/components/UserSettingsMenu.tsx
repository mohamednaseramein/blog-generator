import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export type AuthMenuState = 'logged_in' | 'logged_out';

type MenuItem =
  | { type: 'link'; label: string; onClick: () => void }
  | { type: 'danger'; label: string; onClick: () => Promise<void> };

interface Props {
  /**
   * Optional override for the auth state. When omitted, the menu auto-detects
   * via `useAuth()`. Pass explicitly when the consumer already knows the state
   * (e.g. the shared `AppHeader`) to avoid a redundant context read.
   */
  authState?: AuthMenuState;
}

export function UserSettingsMenu({ authState: authStateProp }: Props = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const authState: AuthMenuState = authStateProp ?? (user ? 'logged_in' : 'logged_out');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        itemRefs.current[0]?.focus();
      });
    }
  }, [isOpen]);

  const items: MenuItem[] =
    authState === 'logged_in'
      ? [
          { type: 'link', label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { type: 'link', label: 'My profile', onClick: () => navigate('/profile') },
          {
            type: 'danger',
            label: 'Logout',
            onClick: async () => {
              await logout();
              navigate('/login', { replace: true });
            },
          },
        ]
      : [
          { type: 'link', label: 'Sign in', onClick: () => navigate('/login') },
          { type: 'link', label: 'Sign up', onClick: () => navigate('/register') },
        ];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account menu"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-4 w-4 text-slate-500"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-slate-700">Account</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 z-50 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          {items.map((item, idx) => {
            const base =
              'flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors';
            const cls =
              item.type === 'danger'
                ? `${base} text-red-600 hover:bg-red-50`
                : `${base} text-slate-700 hover:bg-slate-50`;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={cls}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onClick={async () => {
                  setIsOpen(false);
                  await item.onClick();
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
