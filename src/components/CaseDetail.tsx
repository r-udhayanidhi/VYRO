import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Timeline } from '@/components/Timeline';
import { CaseProgress } from '@/components/CaseProgress';
import { StatusBadge, PriorityBadge, SOSBadge, VerificationBadge } from '@/components/Badges';
import { SOSLocation } from '@/components/SOSLocation';
import { LoadingState, ErrorState } from '@/components/States';
import { usePolling } from '@/hooks/usePolling';
import {
  getCase,
  getCaseEvents,
  getSOSForCase,
  getAssignmentForCase,
  isSOSCase,
} from '@/lib/services';
import { formatExact, formatShort } from '@/lib/format';
import type { CaseRecord, CaseEvent, SOSRecord, RescueAssignment } from '@/lib/types';
import type { CaseStatus, Role } from '@/lib/constants';

export interface CaseDetailContext {
  caseRecord: CaseRecord;
  sos: SOSRecord | null;
  assignment: RescueAssignment | null;
  isSOS: boolean;
  refresh: () => Promise<void>;
}

interface CaseDetailProps {
  role: Role;
  /** Rendered in an "Actions" card; receives fresh case data. */
  renderActions?: (ctx: CaseDetailContext) => React.ReactNode;
  children?: React.ReactNode;
}

const RESCUE_LABEL: Record<string, string> = {
  ASSIGNED: 'Team assigned — waiting to accept',
  ACCEPTED: 'Mission accepted',
  EN_ROUTE: 'En route',
  ON_SITE: 'On site',
  LOCATED: 'Person located',
  COMPLETED: 'Rescue complete',
};

export function CaseDetail({ role, renderActions, children }: CaseDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [sos, setSos] = useState<SOSRecord | null>(null);
  const [assignment, setAssignment] = useState<RescueAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFamily = role === 'family';

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [c, ev, s, a] = await Promise.all([
        getCase(id),
        getCaseEvents(id),
        getSOSForCase(id),
        getAssignmentForCase(id),
      ]);
      setCaseRecord(c);
      setEvents(ev);
      setSos(s);
      setAssignment(a);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  usePolling(load, 5000);

  if (loading) {
    return (
      <DashboardLayout role={role}>
        <LoadingState message="Loading case…" />
      </DashboardLayout>
    );
  }
  if (error && !caseRecord) {
    return (
      <DashboardLayout role={role}>
        <ErrorState message={error} />
      </DashboardLayout>
    );
  }
  if (!caseRecord) {
    return (
      <DashboardLayout role={role}>
        <ErrorState message="Case not found." />
      </DashboardLayout>
    );
  }

  const isSOS = isSOSCase(caseRecord, sos ? { [caseRecord.case_id]: sos } : undefined);
  const status = caseRecord.status as CaseStatus;
  const latest = events[events.length - 1];
  const ctx: CaseDetailContext = { caseRecord, sos, assignment, isSOS, refresh: load };

  return (
    <DashboardLayout role={role}>
      <Link
        to={isFamily ? '/family/cases' : '/rmt/cases'}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cases
      </Link>

      <div className={`rounded-xl p-4 ${isSOS ? 'border-2 border-red-300 bg-red-50' : ''}`}>
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-xl font-bold text-navy-900">{caseRecord.case_id}</h1>
          <button onClick={load} className="text-slate-400 hover:text-navy-600" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {isSOS ? `Emergency SOS — ${caseRecord.person_name}` : caseRecord.person_name}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={caseRecord.priority} />
          {isSOS && <SOSBadge />}
          <StatusBadge status={status} />
        </div>
        {error && <p className="mt-2 text-xs text-amber-700">Couldn’t refresh just now — showing last known data.</p>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Tracking summary */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Case status</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <InfoRow label="Current status" value={<StatusBadge status={status} />} />
              <InfoRow
                label="Rescue status"
                value={
                  assignment
                    ? `${assignment.team_name} — ${RESCUE_LABEL[assignment.status] ?? assignment.status}`
                    : 'No rescue team assigned yet'
                }
              />
              <InfoRow
                label="Verification"
                value={
                  latest?.verification ? (
                    <VerificationBadge verification={latest.verification} />
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow
                label="Latest update"
                value={
                  latest ? (
                    <span>
                      <span className="font-semibold">{latest.action}</span>
                      <span className="block text-xs text-slate-500">{formatShort(latest.created_at)}</span>
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
            </dl>
          </section>

          {/* Location */}
          {isSOS && sos && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">SOS location</h2>
              <div className="mt-3">
                <SOSLocation sos={sos} embed={!isFamily} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                SOS triggered {formatExact(sos.triggered_at ?? sos.created_at)}
              </p>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Case information
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Person" value={caseRecord.person_name} />
              {caseRecord.age != null && <InfoRow label="Age" value={String(caseRecord.age)} />}
              {caseRecord.gender && <InfoRow label="Gender" value={caseRecord.gender} />}
              {caseRecord.relationship && <InfoRow label="Relationship" value={caseRecord.relationship} />}
              {!isSOS && <InfoRow label="Location" value={caseRecord.last_seen_location ?? '—'} />}
              {caseRecord.last_seen_date && <InfoRow label="Last seen date" value={caseRecord.last_seen_date} />}
              {caseRecord.last_seen_time && <InfoRow label="Last seen time" value={caseRecord.last_seen_time} />}
              {caseRecord.clothing && <InfoRow label="Clothing" value={caseRecord.clothing} />}
              {caseRecord.description && <InfoRow label="Description" value={caseRecord.description} />}
              {!isFamily && sos?.contact_phone && <InfoRow label="Contact" value={sos.contact_phone} />}
              <InfoRow label="Created" value={formatShort(caseRecord.created_at)} />
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Progress</h2>
            <div className="mt-4">
              <CaseProgress status={status} />
            </div>
          </section>

          <section id="timeline" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Timeline</h2>
            <div className="mt-4">
              <Timeline events={events} variant={isFamily ? 'family' : 'full'} />
            </div>
          </section>
        </div>
      </div>

      {renderActions && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Actions</h2>
          <div className="mt-4">{renderActions(ctx)}</div>
        </div>
      )}

      {children}
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
    </div>
  );
}
