import { type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'google';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' &&
          'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-indigo-500',
        variant === 'google' &&
          'border border-[#EA8600] bg-[#FBBC05] text-[#202124] shadow-sm hover:bg-[#F5A623] hover:border-[#D97706] active:bg-[#EA8600] focus-visible:ring-amber-500',
        size === 'md' && 'h-10 px-5 text-sm',
        size === 'sm' && 'h-8 px-3 text-xs',
        className,
      )}
    >
      {children}
    </button>
  );
}
