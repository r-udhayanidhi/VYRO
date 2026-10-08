import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PRIORITIES, type Priority } from '@/lib/constants';
import { createCase, ensureUser } from '@/lib/services';
import { getCurrentUser } from '@/lib/session';
import type { NewCaseInput } from '@/lib/types';

export function ReportMissing() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    person_name: '',
    age: '',
    gender: 'Male',
    relationship: '',
    last_seen_location: '',
    last_seen_date: '',
    last_seen_time: '',
    clothing: '',
    description: '',
    priority: 'high' as Priority,
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = getCurrentUser();
      await ensureUser(user);
      const input: NewCaseInput = {
        person_name: form.person_name,
        age: form.age ? parseInt(form.age, 10) : null,
        gender: form.gender,
        relationship: form.relationship,
        last_seen_location: form.last_seen_location,
        last_seen_date: form.last_seen_date,
        last_seen_time: form.last_seen_time,
        clothing: form.clothing,
        description: form.description,
        priority: form.priority,
        created_by: 'family',
        user_id: user.id,
      };
      const record = await createCase(input);
      setSuccess(record.case_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <DashboardLayout role="family">
        <div className="mx-auto max-w-lg rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-lg font-bold text-emerald-800">
            Missing-person report created successfully.
          </h2>
          <p className="mt-2 text-sm text-emerald-700">
            Case ID:{' '}
            <span className="font-mono font-bold">{success}</span>
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => navigate(`/family/cases/${success}`)}
              className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            >
              View Case
            </button>
            <button
              onClick={() => {
                setSuccess(null);
                setForm({
                  person_name: '',
                  age: '',
                  gender: 'Male',
                  relationship: '',
                  last_seen_location: '',
                  last_seen_date: '',
                  last_seen_time: '',
                  clothing: '',
                  description: '',
                  priority: 'high',
                });
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Report Another
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="family">
      <Link
        to="/family/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-navy-900">Report Missing Person</h1>
      <p className="mt-1 text-sm text-slate-500">
        Provide details about the missing person. This will create a case and notify the RMT.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <input
              required
              value={form.person_name}
              onChange={(e) => update('person_name', e.target.value)}
              className={inputClass}
              placeholder="Full name"
            />
          </Field>
          <Field label="Age">
            <input
              type="number"
              min="0"
              value={form.age}
              onChange={(e) => update('age', e.target.value)}
              className={inputClass}
              placeholder="Age"
            />
          </Field>
          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
              className={inputClass}
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Relationship">
            <input
              value={form.relationship}
              onChange={(e) => update('relationship', e.target.value)}
              className={inputClass}
              placeholder="e.g. Brother, Mother"
            />
          </Field>
          <Field label="Last Seen Location" required>
            <input
              required
              value={form.last_seen_location}
              onChange={(e) => update('last_seen_location', e.target.value)}
              className={inputClass}
              placeholder="e.g. Coastal Road, Sector 7"
            />
          </Field>
          <Field label="Last Seen Date">
            <input
              type="date"
              value={form.last_seen_date}
              onChange={(e) => update('last_seen_date', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Last Seen Time">
            <input
              type="time"
              value={form.last_seen_time}
              onChange={(e) => update('last_seen_time', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Priority">
            <select
              value={form.priority}
              onChange={(e) => update('priority', e.target.value as Priority)}
              className={inputClass}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Clothing Description">
          <input
            value={form.clothing}
            onChange={(e) => update('clothing', e.target.value)}
            className={inputClass}
            placeholder="e.g. Blue shirt, dark trousers"
          />
        </Field>

        <Field label="Additional Information">
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder="Any additional details..."
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-navy-700 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {submitting ? 'Creating report...' : 'Submit Report'}
        </button>
      </form>
    </DashboardLayout>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
