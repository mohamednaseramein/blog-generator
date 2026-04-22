/**
 * Color code for the 5-step blog wizard. Tailwind class strings must stay
 * literal (no dynamic interpolation) so the Vite build includes them.
 */
export const WIZARD_STEPS: { label: string }[] = [
  { label: 'Blog Brief' },
  { label: 'AI Alignment' },
  { label: 'Outline' },
  { label: 'Draft' },
  { label: 'Publish' },
] as const;

const CIRCLE: Record<
  number,
  { done: string; active: string; todo: string }
> = {
  1: {
    done: 'border-indigo-600 bg-indigo-600 text-white',
    active: 'border-indigo-600 bg-white text-indigo-600 ring-2 ring-indigo-200',
    todo: 'border-slate-200 bg-slate-50 text-slate-400',
  },
  2: {
    done: 'border-violet-600 bg-violet-600 text-white',
    active: 'border-violet-600 bg-white text-violet-600 ring-2 ring-violet-200',
    todo: 'border-slate-200 bg-slate-50 text-slate-400',
  },
  3: {
    done: 'border-amber-500 bg-amber-500 text-white',
    active: 'border-amber-500 bg-white text-amber-600 ring-2 ring-amber-200',
    todo: 'border-slate-200 bg-slate-50 text-slate-400',
  },
  4: {
    done: 'border-emerald-600 bg-emerald-600 text-white',
    active: 'border-emerald-600 bg-white text-emerald-600 ring-2 ring-emerald-200',
    todo: 'border-slate-200 bg-slate-50 text-slate-400',
  },
  5: {
    done: 'border-rose-500 bg-rose-500 text-white',
    active: 'border-rose-500 bg-white text-rose-600 ring-2 ring-rose-200',
    todo: 'border-slate-200 bg-slate-50 text-slate-400',
  },
};

const LABEL_ACTIVE: Record<number, string> = {
  1: 'text-indigo-600',
  2: 'text-violet-600',
  3: 'text-amber-600',
  4: 'text-emerald-600',
  5: 'text-rose-600',
};

/** Filled track after this step, when that step is complete (current is past it). */
const LINE_DONE: Record<number, string> = {
  1: 'bg-indigo-500',
  2: 'bg-violet-500',
  3: 'bg-amber-400',
  4: 'bg-emerald-500',
  5: 'bg-rose-500',
};

const LABEL_DONE: Record<number, string> = {
  1: 'text-indigo-600/80',
  2: 'text-violet-600/80',
  3: 'text-amber-700/90',
  4: 'text-emerald-600/80',
  5: 'text-rose-600/80',
};

export function wizardStepCircle(
  stepNum: number,
  state: 'done' | 'active' | 'todo',
): string {
  return CIRCLE[stepNum][state] ?? CIRCLE[1].todo;
}

export function wizardStepLabelActive(stepNum: number): string {
  return LABEL_ACTIVE[stepNum] ?? 'text-slate-600';
}

export function wizardStepLabelDone(stepNum: number): string {
  return LABEL_DONE[stepNum] ?? 'text-slate-600';
}

/** Connector line after this step, when the step is completed. */
export function wizardStepLineDone(stepNum: number): string {
  return LINE_DONE[stepNum] ?? 'bg-slate-200';
}
