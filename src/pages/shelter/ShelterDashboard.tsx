import { useEffect, useState, useCallback } from 'react';
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard, LoadingState, ErrorState, EmptyState } from '@/components/States';
import { getShelters, admitToShelter, getCases } from '@/lib/services';
import type { CaseRecord, Shelter } from '@/lib/types';

export function ShelterDashboard() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [form, setForm] = useState({
    shelterId: '',
    personName: '',
    caseId: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sh, cs] = await Promise.all([getShelters(), getCases()]);
      setShelters(sh);
      setCases(cs);
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

  const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
  const totalOccupied = shelters.reduce((sum, s) => sum + s.occupied, 0);
  const totalAvailable = totalCapacity - totalOccupied;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);
    try {
      if (!shelters.some((s) => s.id === form.shelterId)) throw new Error('Please select a shelter');
      // Validates the VYRO case id first, then takes the bed and moves the SAME case.
      await admitToShelter({
        shelterId: form.shelterId,
        personName: form.personName,
        caseId: form.caseId || undefined,
      });
      setFormMsg({ type: 'ok', text: 'Arrival registered successfully' });
      setForm({ shelterId: '', personName: '', caseId: '' });
      setShowForm(false);
      load();
      setTimeout(() => setFormMsg(null), 3000);
    } catch (e) {
      setFormMsg({
        type: 'err',
        text: e instanceof Error ? e.message : 'Registration failed',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout role="shelter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Shelter Dashboard</h1>
            <p className="text-sm text-slate-500">Capacity management and arrivals</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          {showForm ? 'Cancel' : 'Register Arrival'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Capacity" value={totalCapacity} accent="navy" />
        <StatCard label="Occupied" value={totalOccupied} accent="amber" />
        <StatCard label="Available" value={totalAvailable} accent="emerald" />
        <StatCard label="Shelters" value={shelters.length} accent="blue" />
      </div>

      {formMsg && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
            formMsg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {formMsg.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {formMsg.text}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              Shelter <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.shelterId}
              onChange={(e) => setForm({ ...form, shelterId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
            >
              <option value="" disabled>
                Select a shelter...
              </option>
              {shelters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.occupied}/{s.capacity})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              Person Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.personName}
              onChange={(e) => setForm({ ...form, personName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              placeholder="Name or Unknown-001"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              Case ID (optional)
            </label>
            <input
              list="shelter-case-ids"
              value={form.caseId}
              onChange={(e) => setForm({ ...form, caseId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              placeholder="Link to an existing case"
            />
            <datalist id="shelter-case-ids">
              {cases
                .filter((c) => c.status !== 'REUNITED')
                .map((c) => (
                  <option key={c.id} value={c.case_id}>
                    {c.person_name}
                  </option>
                ))}
            </datalist>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-navy-700 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Register Arrival'}
          </button>
        </form>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-navy-900">Shelters</h2>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : shelters.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No shelters configured"
              description="Shelters will appear here once set up."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shelters.map((s) => {
              const pct = s.capacity > 0 ? (s.occupied / s.capacity) * 100 : 0;
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-navy-900">{s.name}</h3>
                  {s.location && (
                    <p className="text-sm text-slate-500">{s.location}</p>
                  )}
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-navy-800">
                      {s.occupied}
                    </span>
                    <span className="text-sm text-slate-400">
                      / {s.capacity}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 90
                          ? 'bg-red-500'
                          : pct >= 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {s.capacity - s.occupied} beds available
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
