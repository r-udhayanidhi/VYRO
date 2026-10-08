import { useEffect, useState, useCallback } from 'react';
import { Ambulance, CheckCircle2, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard, LoadingState, ErrorState, EmptyState } from '@/components/States';
import { getCases, getHospitalPatients, registerHospitalPatient } from '@/lib/services';
import type { CaseRecord, HospitalPatient } from '@/lib/types';
import type { CaseStatus } from '@/lib/constants';

export function HospitalDashboard() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [patients, setPatients] = useState<HospitalPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [form, setForm] = useState({
    case_id: '',
    patient_name: '',
    age: '',
    gender: 'Male',
    condition: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([getCases(), getHospitalPatients()]);
      setCases(c);
      setPatients(p);
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

  // Same VYRO case id end to end: cases transferred to hospital that have no patient record yet.
  const registeredIds = new Set(patients.map((p) => p.case_id));
  const hospitalCases = cases.filter(
    (c) => c.status === 'HOSPITAL_TRANSFER' && !registeredIds.has(c.case_id)
  );
  const critical = patients.filter((p) =>
    p.condition.toLowerCase().includes('critical')
  );
  const unidentified = patients.filter((p) =>
    p.patient_name.toLowerCase().includes('unknown')
  );

  function prefill(c: CaseRecord) {
    setForm({
      case_id: c.case_id,
      patient_name: c.person_name,
      age: c.age != null ? String(c.age) : '',
      gender: c.gender || 'Male',
      condition: '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);
    try {
      await registerHospitalPatient({
        case_id: form.case_id,
        patient_name: form.patient_name,
        age: form.age ? parseInt(form.age, 10) : null,
        gender: form.gender,
        condition: form.condition,
      });
      setFormMsg({ type: 'ok', text: 'Patient registered successfully' });
      setForm({ case_id: '', patient_name: '', age: '', gender: 'Male', condition: '' });
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
    <DashboardLayout role="hospital">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <Ambulance className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Hospital Dashboard</h1>
            <p className="text-sm text-slate-500">Patient registration and tracking</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          {showForm ? 'Cancel' : 'Register Patient'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available Beds" value={50 - patients.length} accent="emerald" />
        <StatCard label="Critical Patients" value={critical.length} accent="red" />
        <StatCard label="Incoming" value={hospitalCases.length} accent="amber" />
        <StatCard label="Unidentified" value={unidentified.length} accent="navy" />
      </div>

      {hospitalCases.length > 0 && (
        <section className="mt-6 rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">
            Incoming transfers ({hospitalCases.length})
          </h2>
          <ul className="mt-2 space-y-2">
            {hospitalCases.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 text-sm">
                <span className="font-mono text-xs font-bold text-navy-800">{c.case_id}</span>
                <span className="font-medium text-slate-800">{c.person_name}</span>
                <button
                  onClick={() => prefill(c)}
                  className="ml-auto rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                >
                  Register arrival
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                Case ID <span className="text-red-500">*</span>
              </label>
              <input
                required
                list="case-ids"
                value={form.case_id}
                onChange={(e) => setForm({ ...form, case_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                placeholder="VYRO-2026-XXXXX"
              />
              <datalist id="case-ids">
                {cases.map((c) => (
                  <option key={c.id} value={c.case_id} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                Name / Unknown ID <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.patient_name}
                onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                placeholder="Patient name or Unknown-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Age</label>
              <input
                type="number"
                min="0"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600">
                Condition <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                placeholder="e.g. Stable, Critical, Head injury"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-navy-700 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Register Patient'}
          </button>
        </form>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-navy-900">Registered Patients</h2>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : patients.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No patients registered yet"
              description="Register a patient using the form above."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Case ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Age</th>
                  <th className="px-4 py-3 font-medium">Gender</th>
                  <th className="px-4 py-3 font-medium">Condition</th>
                  <th className="px-4 py-3 font-medium">Arrival</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-navy-700">
                      {p.case_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {p.patient_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.age ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.gender}</td>
                    <td className="px-4 py-3 text-slate-600">{p.condition}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(p.arrival_time).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
