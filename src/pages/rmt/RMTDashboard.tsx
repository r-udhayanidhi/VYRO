import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Siren } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard, LoadingState, ErrorState, EmptyState } from '@/components/States';
import { StatusBadge, PriorityBadge, SOSBadge } from '@/components/Badges';
import { SOSAlertCard } from '@/components/SOSAlertCard';
import { SOSLocation } from '@/components/SOSLocation';
import { usePolling } from '@/hooks/usePolling';
import { getCaseBoard, getShelters, isSOSCase, type CaseBoard } from '@/lib/services';
import { HOSPITALS, type CaseStatus } from '@/lib/constants';
import type { Shelter } from '@/lib/types';

export function RMTDashboard() {
  const [board, setBoard] = useState<CaseBoard | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, s] = await Promise.all([getCaseBoard(), getShelters()]);
      setBoard(b);
      setShelters(s);
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

  if (loading) {
    return (
      <DashboardLayout role="rmt">
        <LoadingState />
      </DashboardLayout>
    );
  }
  if (error && !board) {
    return (
      <DashboardLayout role="rmt">
        <ErrorState message={error} />
      </DashboardLayout>
    );
  }

  const { cases, sosByCase, assignmentByCase } = board!;
  const active = cases.filter((c) => c.status !== 'REUNITED');
  const critical = active.filter((c) => c.priority === 'critical');
  const activeSOS = cases
    .filter((c) => isSOSCase(c, sosByCase) && c.status !== 'REUNITED')
    // unacknowledged first, then newest
    .sort(
      (a, b) =>
        Number(b.status === 'SOS_SENT') - Number(a.status === 'SOS_SENT') ||
        b.created_at.localeCompare(a.created_at)
    );
  const newSOS = activeSOS.filter((c) => c.status === 'SOS_SENT');
  const teamsBusy = new Set(
    Object.values(assignmentByCase)
      .filter((a) => a.status !== 'COMPLETED')
      .map((a) => a.team_name)
  ).size;

  return (
    <DashboardLayout role="rmt">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100 text-navy-700">
          <Radio className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-navy-900">RMT Command Center</h1>
          <p className="text-sm text-slate-500">
            Rescue Management Team — oversee all active cases
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label="New SOS" value={newSOS.length} accent="red" />
        <StatCard label="Active Cases" value={active.length} accent="navy" />
        <StatCard label="Critical Cases" value={critical.length} accent="red" />
        <StatCard label="Teams Deployed" value={teamsBusy} accent="orange" />
        <StatCard label="Hospitals" value={HOSPITALS.length} accent="blue" />
        <StatCard label="Shelters" value={shelters.length} accent="emerald" />
      </div>

      <section className="mt-8" aria-label="SOS emergencies">
        <div className="flex items-center gap-2">
          <Siren className={`h-5 w-5 ${newSOS.length ? 'animate-pulse text-red-600' : 'text-red-400'}`} />
          <h2 className="text-lg font-semibold text-navy-900">SOS Emergencies</h2>
          {newSOS.length > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              {newSOS.length} new
            </span>
          )}
        </div>
        {activeSOS.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No active SOS"
              description="Family SOS alerts appear here instantly, at the top of the dashboard."
            />
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {activeSOS.map((c) => (
              <SOSAlertCard
                key={c.case_id}
                c={c}
                sos={sosByCase[c.case_id]}
                assignment={assignmentByCase[c.case_id]}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">All Active Cases</h2>
          <Link to="/rmt/cases" className="text-sm font-semibold text-navy-600 hover:text-navy-800">
            View All →
          </Link>
        </div>

        {active.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No cases in the system"
              description="New reports from families will appear here."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Case ID</th>
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.slice(0, 10).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-navy-700">{c.case_id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {c.person_name} {isSOSCase(c, sosByCase) && <SOSBadge />}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {sosByCase[c.case_id] ? (
                        <SOSLocation sos={sosByCase[c.case_id]} compact />
                      ) : (
                        c.last_seen_location ?? '—'
                      )}
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status as CaseStatus} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/rmt/cases/${c.case_id}`}
                        className="text-xs font-semibold text-navy-600 hover:text-navy-800"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
