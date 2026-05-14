import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';

interface WorkspaceLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function WorkspaceLayout({ sidebar, children }: WorkspaceLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <AppHeader />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:px-8 lg:py-10">
        {sidebar}
        <div className="min-w-0 flex-1 lg:max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
