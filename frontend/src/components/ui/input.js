import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { clsx } from 'clsx';
export const Input = forwardRef(({ error, className, ...props }, ref) => (_jsx("input", { ref: ref, ...props, className: clsx('w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50', error ? 'border-red-400 focus:ring-red-400' : 'border-slate-300', className) })));
Input.displayName = 'Input';
