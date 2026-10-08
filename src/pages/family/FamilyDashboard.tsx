import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, FolderOpen, Bell, UserRound } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard, LoadingState, ErrorState, EmptyState } from '@/components/States';
import { StatusBadge, PriorityBadge, SOSBadge } from '@/components/Badges';
import { SOSPanel } from '@/components/SOSPanel';
import { usePolling } from '@/hooks/usePolling';
import { getCasesForUser, ensureUser } from '@/lib/services';
import { getCurrentUser, saveCurrentUser } from '@/lib/session';
import { formatShort } from '@/lib/format';
import type { CaseRecord } from '@/lib/types';
import type { CaseStatus } from '@/lib/constants';

export function FamilyDashboard() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCases(await getCasesForUser(getCurrentUser().id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  usePolling(load, 6000);

  const activeCases = cases.filter((c) => c.status !== 'REUNITED');
  const sosCases = cases.filter((c) => c.case_type === 'SOS');
  const activeSOS = sosCases.filter((c) => c.status !== 'REUNITED');

  return (
    <DashboardLayout role="family">
      <h1 className="text-2xl font-bold text-navy-900">Family Dashboard</h1>

      <section className="mx-auto mt-6 max-w-2xl">
        <SOSPanel onCreated={load} />
      </section>

      {activeSOS.length > 0 && (
        <section className="mt-6 rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">Active SOS</h2>
          <ul className="mt-2 space-y-2">
            {activeSOS.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3">
                <span className="font-mono text-sm font-bold text-navy-800">{c.case_id}</span>
                <StatusBadge status={c.status as CaseStatus} />
                <Link
                  to={`/family/cases/${c.case_id}`}
                  className="ml-auto text-sm font-semibold text-navy-600 hover:text-navy-800"
                >
                  Track →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Cases" value={activeCases.length} accent="navy" />
        <StatCard label="Total Cases" value={cases.length} accent="blue" />
        <StatCard label="SOS Sent" value={sosCases.length} accent="red" />
        <StatCard label="Active SOS" value={activeSOS.length} accent="amber" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/family/report-missing"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
        >
          <Search className="h-4 w-4" />
          Report Missing
        </Link>
        <Link
          to="/family/cases"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 hover:bg-slate-50"
        >
          <FolderOpen className="h-4 w-4" />
          View Cases
        </Link>
      </div>

      <ProfileCard />

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-navy-600" />
          <h2 className="text-lg font-semibold text-navy-900">Recent Cases</h2>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : cases.length === 0 ? (
          <EmptyState
            title="No cases yet"
            description="Report a missing person or hold the SOS button to get started."
          />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
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
                {cases.slice(0, 8).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-navy-700">{c.case_id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {c.person_name} {c.case_type === 'SOS' && <SOSBadge />}
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status as CaseStatus} /></td>
                    <td className="px-4 py-3 text-slate-500">{formatShort(c.updated_at)}</td>
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
      </section>
    </DashboardLayout>
  );
}

/** Name + phone sent to RMT with every SOS. */
function ProfileCard() {
  const [user, setUser] = useState(getCurrentUser());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next = saveCurrentUser({ ...user, name: name.trim() || user.name, phone: phone.trim() });
    setUser(next);
    await ensureUser(next);
    setSaved(true);
    setOpen(false);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <UserRound className="h-4 w-4 text-navy-600" />
        <span className="font-semibold text-slate-800">{user.name}</span>
        <span className="text-slate-500">{user.phone || 'No phone number set'}</span>
        {saved && <span className="text-xs font-semibold text-emerald-600">Saved</span>}
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto text-xs font-semibold text-navy-600 hover:text-navy-800"
        >
          {open ? 'Cancel' : 'Edit SOS contact details'}
        </button>
      </div>
      {open && (
        <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (shared with RMT on SOS)"
            inputMode="tel"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
          />
          <button className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
            Save
          </button>
        </form>
      )}
    </div>
  );
}
