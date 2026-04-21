import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from 'clsx';
export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
    return (_jsx("button", { ...props, className: clsx('inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50', variant === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800', variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 hover:text-slate-900', size === 'md' && 'h-10 px-5 text-sm', size === 'sm' && 'h-8 px-3 text-xs', className), children: children }));
}
