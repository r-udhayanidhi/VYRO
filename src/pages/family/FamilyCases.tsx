import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { getCasesForUser } from '@/lib/services';
import { getCurrentUser } from '@/lib/session';
import { SOSBadge } from '@/components/Badges';
import type { CaseRecord } from '@/lib/types';
import type { CaseStatus } from '@/lib/constants';

export function FamilyCases() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCasesForUser(getCurrentUser().id)
      .then(setCases)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="family">
      <h1 className="text-2xl font-bold text-navy-900">My Cases</h1>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : cases.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No cases yet"
            description="Report a missing person or send an SOS to create your first case."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Case ID</th>
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Update</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-navy-700">
                    {c.case_id}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {c.person_name} {c.case_type === 'SOS' && <SOSBadge />}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status as CaseStatus} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(c.updated_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/family/cases/${c.case_id}`}
                      className="text-xs font-semibold text-navy-600 hover:text-navy-800"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
