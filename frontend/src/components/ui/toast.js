import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
const styles = {
    error: 'bg-red-50 border-red-300 text-red-800',
    success: 'bg-green-50 border-green-300 text-green-800',
    info: 'bg-slate-50 border-slate-300 text-slate-700',
};
const icons = { error: '✕', success: '✓', info: 'ℹ' };
export function Toast({ variant, children }) {
    return (_jsxs("div", { role: "alert", className: clsx('flex items-start gap-2 rounded-lg border px-4 py-3 text-sm', styles[variant]), children: [_jsx("span", { className: "mt-px font-bold", children: icons[variant] }), _jsx("span", { children: children })] }));
}
