import type { CaseStatus, Priority, Verification } from '@/lib/constants';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  VERIFICATION_LABELS,
} from '@/lib/constants';

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? STATUS_COLORS.REPORTED}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
        priority === 'critical' ? 'uppercase tracking-wide' : 'capitalize'
      } ${PRIORITY_COLORS[priority]}`}
    >
      {priority}
    </span>
  );
}

export function SOSBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
      🚨 SOS
    </span>
  );
}

const VERIFICATION_STYLE: Record<Verification, string> = {
  DEVICE_GPS: 'bg-sky-50 text-sky-700 border-sky-200',
  SYSTEM: 'bg-slate-50 text-slate-600 border-slate-200',
  UNVERIFIED: 'bg-amber-50 text-amber-700 border-amber-200',
  FIELD_REPORTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  RMT_VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function VerificationBadge({ verification }: { verification?: Verification | null }) {
  if (!verification) return null;
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${
        VERIFICATION_STYLE[verification] ?? VERIFICATION_STYLE.SYSTEM
      }`}
    >
      {VERIFICATION_LABELS[verification] ?? verification}
    </span>
  );
}
