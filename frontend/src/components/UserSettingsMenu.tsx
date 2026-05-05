import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type MenuItem =
  | { type: 'link'; label: string; onClick: () => void }
  | { type: 'danger'; label: string; onClick: () => Promise<void> };

export function UserSettingsMenu() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const items: MenuItem[] = [
    {
      type: 'link',
      label: 'My profile',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'link',
      label: 'My blogs',
      onClick: () => {
        if (location.pathname === '/') {
          navigate('/', { replace: true, state: { open: 'history' } });
        } else {
          navigate('/', { state: { open: 'history' } });
        }
      },
    },
    {
      type: 'danger',
      label: 'Logout',
      onClick: async () => {
        await logout();
        navigate('/login', { replace: true });
      },
    },
  ];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <span className="text-slate-500">Settings</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="User settings"
          className="absolute right-0 z-50 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          {items.map((item) => {
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

