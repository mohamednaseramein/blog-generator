import { clsx } from 'clsx';

const STEPS = [
  { label: 'Blog Brief' },
  { label: 'AI Alignment' },
  { label: 'Outline' },
  { label: 'Draft' },
  { label: 'Publish' },
];

interface Props {
  current: number; // 1-based
}

export function WizardProgress({ current }: Props) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const stepNum = index + 1;
          const done = stepNum < current;
          const active = stepNum === current;

          return (
            <li key={step.label} className={clsx('flex items-center', index < STEPS.length - 1 && 'flex-1')}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  aria-current={active ? 'step' : undefined}
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                    done && 'border-indigo-600 bg-indigo-600 text-white',
                    active && 'border-indigo-600 bg-white text-indigo-600',
                    !done && !active && 'border-slate-300 bg-white text-slate-400',
                  )}
                >
                  {done ? '✓' : stepNum}
                </div>
                <span
                  className={clsx(
                    'hidden text-xs font-medium sm:block',
                    active ? 'text-indigo-600' : done ? 'text-slate-600' : 'text-slate-400',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={clsx(
                    'mb-5 h-0.5 flex-1 mx-2 transition-colors',
                    done ? 'bg-indigo-600' : 'bg-slate-200',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
