import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Eye, History } from 'lucide-react';
import { PriorityBadge, StatusBadge, SOSBadge } from '@/components/Badges';
import { SOSLocation } from '@/components/SOSLocation';
import { RMTActions } from '@/components/CaseActions';
import { Timeline } from '@/components/Timeline';
import { getCaseEvents } from '@/lib/services';
import { formatExact } from '@/lib/format';
import type { CaseStatus } from '@/lib/constants';
import type { CaseEvent, CaseRecord, RescueAssignment, SOSRecord } from '@/lib/types';

/** RMT view of an SOS: CRITICAL, case id, person, time, location, status + actions. */
export function SOSAlertCard({
  c,
  sos,
  assignment,
  onChanged,
}: {
  c: CaseRecord;
  sos?: SOSRecord;
  assignment?: RescueAssignment;
  onChanged: () => void;
}) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [events, setEvents] = useState<CaseEvent[] | null>(null);
  const isNew = c.status === 'SOS_SENT';

  async function toggleTimeline() {
    const next = !showTimeline;
    setShowTimeline(next);
    if (next) setEvents(await getCaseEvents(c.case_id).catch(() => []));
  }

  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 shadow-sm ${
        isNew ? 'border-red-500 ring-4 ring-red-100' : 'border-red-200'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isNew && (
          <span className="animate-pulse rounded bg-red-600 px-2 py-0.5 text-xs font-extrabold uppercase text-white">
            New SOS
          </span>
        )}
        <PriorityBadge priority={c.priority} />
        <SOSBadge />
        <StatusBadge status={c.status as CaseStatus} />
        <Link
          to={`/rmt/cases/${c.case_id}`}
          className="ml-auto font-mono text-sm font-bold text-navy-800 hover:underline"
        >
          {c.case_id}
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Person</p>
          <p className="font-semibold text-slate-900">{c.person_name}</p>
          {(sos?.contact_phone) && (
            <a
              href={`tel:${sos.contact_phone}`}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-navy-600"
            >
              <Phone className="h-3 w-3" /> {sos.contact_phone}
            </a>
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Triggered</p>
          <p className="text-sm font-semibold text-slate-800">
            {formatExact(sos?.triggered_at ?? c.created_at)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Location</p>
          {sos ? (
            <SOSLocation sos={sos} compact />
          ) : (
            <span className="text-sm text-slate-600">{c.last_seen_location ?? '—'}</span>
          )}
        </div>
      </div>

      {assignment && (
        <p className="mt-2 text-xs text-slate-500">
          Rescue: <span className="font-semibold text-slate-700">{assignment.team_name}</span> ·{' '}
          {assignment.status}
        </p>
      )}

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
        <RMTActions caseRecord={c} isSOS onDone={onChanged} />
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/rmt/cases/${c.case_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> View case
          </Link>
          <button
            type="button"
            onClick={toggleTimeline}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-slate-50"
          >
            <History className="h-3.5 w-3.5" /> {showTimeline ? 'Hide timeline' : 'View timeline'}
          </button>
        </div>
        {showTimeline && (
          <div className="rounded-lg bg-slate-50 p-4">
            {events ? <Timeline events={events} /> : <p className="text-sm text-slate-500">Loading…</p>}
          </div>
        )}
      </div>
    </div>
  );
}
