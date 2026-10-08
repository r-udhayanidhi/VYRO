import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard, LoadingState, ErrorState, EmptyState } from '@/components/States';
import { StatusBadge, PriorityBadge, SOSBadge } from '@/components/Badges';
import { SOSLocation } from '@/components/SOSLocation';
import { FieldStepButtons } from '@/components/CaseActions';
import { usePolling } from '@/hooks/usePolling';
import { getCaseBoard, isSOSCase, type CaseBoard } from '@/lib/services';
import { RESCUE_TEAMS, type CaseStatus } from '@/lib/constants';

const FIELD_STATUSES: CaseStatus[] = ['RESCUE_ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'LOCATED'];

export function RescueDashboard() {
  const [board, setBoard] = useState<CaseBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<string>('ALL');

  const load = useCallback(async () => {
    try {
      setBoard(await getCaseBoard());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  usePolling(load, 4000);

  const missions = (board?.cases ?? []).filter((c) => {
    if (!FIELD_STATUSES.includes(c.status as CaseStatus)) return false;
    const a = board?.assignmentByCase[c.case_id];
    return team === 'ALL' || a?.team_name === team;
  });

  return (
    <DashboardLayout role="rescue">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Rescue Dashboard</h1>
            <p className="text-sm text-slate-500">Field rescue missions assigned to your team</p>
          </div>
        </div>
        <label className="text-sm text-slate-600">
          Team{' '}
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="ml-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-navy-500 focus:outline-none"
          >
            <option value="ALL">All teams</option>
            {RESCUE_TEAMS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Assigned Missions" value={missions.length} accent="orange" />
        <StatCard label="Awaiting Accept" value={missions.filter((c) => board?.assignmentByCase[c.case_id]?.status === 'ASSIGNED').length} accent="red" />
        <StatCard label="En Route" value={missions.filter((c) => c.status === 'EN_ROUTE').length} accent="amber" />
        <StatCard label="On Site / Located" value={missions.filter((c) => c.status === 'ON_SITE' || c.status === 'LOCATED').length} accent="navy" />
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-navy-900">Active Missions</h2>

        {loading ? (
          <LoadingState />
        ) : error && !board ? (
          <ErrorState message={error} />
        ) : missions.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No active missions"
              description="Missions assigned by the RMT will appear here."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {missions.map((c) => {
              const sos = board!.sosByCase[c.case_id];
              const assignment = board!.assignmentByCase[c.case_id];
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border bg-white p-5 shadow-sm ${
                    c.priority === 'critical' ? 'border-red-300' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/rmt/cases/${c.case_id}`}
                        className="font-mono text-sm font-bold text-navy-700 hover:text-navy-900"
                      >
                        {c.case_id}
                      </Link>
                      <p className="mt-1 font-semibold text-slate-800">
                        {c.person_name} {isSOSCase(c, board!.sosByCase) && <SOSBadge />}
                      </p>
                      <div className="mt-1 text-sm text-slate-500">
                        {sos ? <SOSLocation sos={sos} compact /> : c.last_seen_location ?? '—'}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status as CaseStatus} />
                        {assignment && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            {assignment.team_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <FieldStepButtons
                      caseRecord={c}
                      assignment={assignment}
                      actor="Rescue"
                      onDone={load}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
