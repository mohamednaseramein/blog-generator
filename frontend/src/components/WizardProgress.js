import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
const STEPS = [
    { label: 'Blog Brief' },
    { label: 'AI Alignment' },
    { label: 'Outline' },
    { label: 'Draft' },
    { label: 'Publish' },
];
export function WizardProgress({ current }) {
    return (_jsx("nav", { "aria-label": "Progress", className: "w-full", children: _jsx("ol", { className: "flex items-center", children: STEPS.map((step, index) => {
                const stepNum = index + 1;
                const done = stepNum < current;
                const active = stepNum === current;
                return (_jsxs("li", { className: clsx('flex items-center', index < STEPS.length - 1 && 'flex-1'), children: [_jsxs("div", { className: "flex flex-col items-center gap-1.5", children: [_jsx("div", { "aria-current": active ? 'step' : undefined, className: clsx('flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors', done && 'border-indigo-600 bg-indigo-600 text-white', active && 'border-indigo-600 bg-white text-indigo-600', !done && !active && 'border-slate-300 bg-white text-slate-400'), children: done ? '✓' : stepNum }), _jsx("span", { className: clsx('hidden text-xs font-medium sm:block', active ? 'text-indigo-600' : done ? 'text-slate-600' : 'text-slate-400'), children: step.label })] }), index < STEPS.length - 1 && (_jsx("div", { className: clsx('mb-5 h-0.5 flex-1 mx-2 transition-colors', done ? 'bg-indigo-600' : 'bg-slate-200') }))] }, step.label));
            }) }) }));
}
