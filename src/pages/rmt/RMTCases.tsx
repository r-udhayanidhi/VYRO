import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge, PriorityBadge, SOSBadge } from '@/components/Badges';
import { SOSLocation } from '@/components/SOSLocation';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { usePolling } from '@/hooks/usePolling';
import { getCaseBoard, isSOSCase, type CaseBoard } from '@/lib/services';
import { formatShort } from '@/lib/format';
import type { CaseStatus } from '@/lib/constants';

export function RMTCases() {
  const [board, setBoard] = useState<CaseBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'sos'>('all');

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
  usePolling(load, 5000);

  const all = board?.cases ?? [];
  const cases = filter === 'sos' ? all.filter((c) => isSOSCase(c, board?.sosByCase)) : all;

  return (
    <DashboardLayout role="rmt">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-900">All Cases</h1>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          {(['all', 'sos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 font-semibold ${
                filter === f ? 'bg-navy-700 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All' : '🚨 SOS only'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error && !board ? (
        <ErrorState message={error} />
      ) : cases.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={filter === 'sos' ? 'No SOS cases' : 'No cases in the system'}
            description="New reports will appear here automatically."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Case ID</th>
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => {
                const sos = board?.sosByCase[c.case_id];
                return (
                  <tr key={c.id} className={c.status === 'SOS_SENT' ? 'bg-red-50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-navy-700">{c.case_id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {c.person_name} {isSOSCase(c, board?.sosByCase) && <SOSBadge />}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {sos ? <SOSLocation sos={sos} compact /> : c.last_seen_location ?? '—'}
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status as CaseStatus} /></td>
                    <td className="px-4 py-3 text-slate-500">{formatShort(c.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/rmt/cases/${c.case_id}`}
                        className="text-xs font-semibold text-navy-600 hover:text-navy-800"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
