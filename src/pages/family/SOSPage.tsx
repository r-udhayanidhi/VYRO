import { Link } from 'react-router-dom';
import { ArrowLeft, Siren } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SOSPanel } from '@/components/SOSPanel';

export function SOSPage() {
  return (
    <DashboardLayout role="family">
      <Link
        to="/family/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
          <Siren className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Emergency SOS</h1>
          <p className="text-sm text-slate-500">
            Hold the button for 7 seconds to alert the Rescue Management Team.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-2xl">
        <SOSPanel />
      </div>
    </DashboardLayout>
  );
}
