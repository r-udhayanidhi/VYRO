import { Check } from 'lucide-react';
import { PROGRESS_STEPS, progressIndex } from '@/lib/constants';
import type { CaseStatus } from '@/lib/constants';

/** Live case progression: SOS SENT → … → REUNITED / SAFE. */
export function CaseProgress({ status }: { status: CaseStatus }) {
  const current = progressIndex(status);
  const finished = status === 'REUNITED';

  return (
    <ol className="space-y-0">
      {PROGRESS_STEPS.map((step, i) => {
        const done = i < current || finished;
        const active = i === current && !finished;
        const sub =
          step.key === 'onsite' && status === 'LOCATED'
            ? 'Person located'
            : step.key === 'care' && status === 'SHELTER_TRANSFER'
              ? 'Shelter'
              : step.key === 'care' && status === 'HOSPITAL_TRANSFER'
                ? 'Hospital'
                : null;
        return (
          <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
            {i < PROGRESS_STEPS.length - 1 && (
              <span
                className={`absolute left-[11px] top-6 h-full w-0.5 ${
                  done ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : active
                    ? 'border-red-500 bg-white text-red-600'
                    : 'border-slate-300 bg-white text-slate-300'
              }`}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" />
              ) : active ? (
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              ) : null}
            </span>
            <div className="-mt-0.5">
              <p
                className={`text-sm font-semibold ${
                  active ? 'text-red-700' : done ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {step.label}
                {active && (
                  <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">
                    Now
                  </span>
                )}
              </p>
              {sub && (active || done) && <p className="text-xs text-slate-500">{sub}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
