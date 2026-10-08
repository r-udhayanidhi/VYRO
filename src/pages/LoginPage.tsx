import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Radio,
  HeartHandshake,
  Ambulance,
  Building2,
  ArrowLeft,
} from 'lucide-react';
import type { Role } from '@/lib/constants';
import { ROLE_LABELS } from '@/lib/constants';

const roleConfig: { role: Role; icon: typeof Users; desc: string; path: string }[] = [
  { role: 'family', icon: Users, desc: 'Report missing persons & send SOS', path: '/family/dashboard' },
  { role: 'rmt', icon: Radio, desc: 'Coordinate the full rescue operation', path: '/rmt/dashboard' },
  { role: 'rescue', icon: HeartHandshake, desc: 'Execute field rescue missions', path: '/rescue/dashboard' },
  { role: 'hospital', icon: Ambulance, desc: 'Register & track patients', path: '/hospital/dashboard' },
  { role: 'shelter', icon: Building2, desc: 'Manage capacity & arrivals', path: '/shelter/dashboard' },
];

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-red-400" />
            <span className="text-lg font-bold">VYRO</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1 text-sm text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-700">
            DEMO MODE
          </div>
          <h1 className="mt-4 text-2xl font-bold text-navy-900 sm:text-3xl">
            Choose a Role to Enter
          </h1>
          <p className="mt-2 text-slate-500">
            Select a role below to explore the VYRO demo dashboard.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {roleConfig.map(({ role, icon: Icon, desc, path }) => (
            <button
              key={role}
              onClick={() => navigate(path)}
              className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-navy-400 hover:shadow-md"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 group-hover:bg-navy-100">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-navy-900">
                  {ROLE_LABELS[role]}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
