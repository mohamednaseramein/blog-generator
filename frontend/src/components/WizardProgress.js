import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
import { WIZARD_STEPS, wizardStepCircle, wizardStepLabelActive, wizardStepLabelDone, wizardStepLineDone, } from '../lib/wizardStepTheme.js';
export function WizardProgress({ current }) {
    return (_jsx("nav", { "aria-label": "Progress", className: "w-full", children: _jsx("ol", { className: "flex items-center", children: WIZARD_STEPS.map((step, index) => {
                const stepNum = index + 1;
                const done = stepNum < current;
                const active = stepNum === current;
                const segmentComplete = stepNum < current;
                return (_jsxs("li", { className: clsx('flex items-center', index < WIZARD_STEPS.length - 1 && 'flex-1'), children: [_jsxs("div", { className: "flex flex-col items-center gap-1.5", children: [_jsx("div", { "aria-current": active ? 'step' : undefined, className: clsx('flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors', done && wizardStepCircle(stepNum, 'done'), active && wizardStepCircle(stepNum, 'active'), !done && !active && wizardStepCircle(stepNum, 'todo')), children: done ? '✓' : stepNum }), _jsx("span", { className: clsx('hidden text-xs font-medium sm:block', active && wizardStepLabelActive(stepNum), !active && done && wizardStepLabelDone(stepNum), !active && !done && 'text-slate-400'), children: step.label })] }), index < WIZARD_STEPS.length - 1 && (_jsx("div", { className: clsx('mb-5 mx-2 h-0.5 flex-1 transition-colors', segmentComplete ? wizardStepLineDone(stepNum) : 'bg-slate-200') }))] }, step.label));
            }) }) }));
}
