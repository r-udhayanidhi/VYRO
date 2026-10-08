import { Loader2, AlertCircle } from 'lucide-react';

export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
      <p className="text-sm">{message ?? 'Loading...'}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 py-12 px-4 text-center">
      <AlertCircle className="h-8 w-8 text-red-500" />
      <p className="text-sm font-medium text-red-700">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 px-4 text-center">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-slate-400">{description}</p>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent = 'navy',
}: {
  label: string;
  value: string | number;
  accent?: 'navy' | 'red' | 'orange' | 'amber' | 'emerald' | 'blue';
}) {
  const accentMap: Record<string, string> = {
    navy: 'border-navy-200 bg-navy-50 text-navy-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-lg border p-4 ${accentMap[accent]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
