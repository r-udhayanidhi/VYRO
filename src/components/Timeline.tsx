import type { CaseEvent } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/constants';
import type { CaseStatus } from '@/lib/constants';
import { formatShort, formatClock } from '@/lib/format';
import { VerificationBadge } from '@/components/Badges';

interface TimelineProps {
  events: CaseEvent[];
  /** 'family' hides internal source details. */
  variant?: 'full' | 'family';
}

/** Case timeline: WHO · WHAT · WHEN · WHERE · SOURCE · STATUS · VERIFICATION. */
export function Timeline({ events, variant = 'full' }: TimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No events recorded yet.</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
      <ol className="space-y-5">
        {events.map((event, i) => {
          const latest = i === events.length - 1;
          const who = event.actor_name
            ? `${event.actor_name} (${event.actor_role})`
            : event.actor_role;
          return (
            <li key={event.id} className="relative pl-10">
              <div
                className={`absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 ${
                  latest ? 'border-red-600 bg-red-500' : 'border-navy-700 bg-white'
                }`}
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <time
                  dateTime={event.created_at}
                  title={formatShort(event.created_at)}
                  className="font-mono text-sm font-bold text-navy-900"
                >
                  {formatClock(event.created_at)}
                </time>
                <span className="text-sm font-semibold text-slate-800">{event.action}</span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {STATUS_LABELS[event.status as CaseStatus] ?? event.status}
                </span>
                <VerificationBadge verification={event.verification} />
              </div>
              {event.description && (
                <p className="mt-0.5 text-sm text-slate-600">{event.description}</p>
              )}
              <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                <div className="flex gap-1">
                  <dt className="font-medium">Who:</dt>
                  <dd>{who}</dd>
                </div>
                {event.location && (
                  <div className="flex gap-1">
                    <dt className="font-medium">Where:</dt>
                    <dd>{event.location}</dd>
                  </div>
                )}
                {variant === 'full' && event.source && (
                  <div className="flex gap-1">
                    <dt className="font-medium">Source:</dt>
                    <dd>{event.source}</dd>
                  </div>
                )}
                <div className="flex gap-1">
                  <dt className="font-medium">When:</dt>
                  <dd>{formatShort(event.created_at)}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
