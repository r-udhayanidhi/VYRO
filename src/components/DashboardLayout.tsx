import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '@/lib/constants';
import { ROLE_LABELS } from '@/lib/constants';
import { USING_SUPABASE, isSchemaCurrent } from '@/lib/services';

interface DashboardLayoutProps {
  role: Role;
  children: React.ReactNode;
}

export function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = getNavItems(role);
  const [schemaOk, setSchemaOk] = useState(true);
  useEffect(() => {
    isSchemaCurrent().then(setSchemaOk).catch(() => setSchemaOk(true));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-navy-900 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-red-400" />
            <div>
              <span className="text-lg font-bold tracking-wide">VYRO</span>
              <span className="ml-2 text-xs text-slate-300">
                Vigilant Rescue Operations
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden rounded-full bg-amber-500/20 sm:inline px-3 py-1 text-xs font-semibold text-amber-300">
              DEMO MODE
            </span>
            <span className="text-sm text-slate-300">
              {ROLE_LABELS[role]}
            </span>
            <button
              onClick={() => navigate('/login')}
              className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20"
            >
              Switch Role
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl px-4 sm:px-6">
          <ul className="flex gap-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path !== `/${role}/dashboard` &&
                  location.pathname.startsWith(item.path));
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      item.path === '/family/sos'
                        ? 'bg-red-600 text-white hover:bg-red-500'
                        : active
                          ? 'bg-white/15 text-white'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {!USING_SUPABASE && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          Local Demo Mode — data is stored in this browser only (shared across tabs). Clear site
          data to reset.
        </div>
      )}
      {USING_SUPABASE && !schemaOk && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-800">
          Database migration pending — run <code>supabase/migrations/20261008120000_vyro_sos_core.sql</code>.
          SOS still works, but GPS coordinates and timeline details are not saved until then.
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <p className="text-xs text-slate-400">
            VYRO © 2026 — From Warning to Rescue. From Rescue to Reunion.
          </p>
        </div>
      </footer>
    </div>
  );
}

interface NavItem {
  path: string;
  label: string;
}

function getNavItems(role: Role): NavItem[] {
  const base: NavItem[] = [{ path: `/${role}/dashboard`, label: 'Dashboard' }];
  if (role === 'family') {
    base.push(
      { path: '/family/report-missing', label: 'Report Missing' },
      { path: '/family/sos', label: 'Emergency SOS' },
      { path: '/family/cases', label: 'My Cases' }
    );
  }
  if (role === 'rmt') {
    base.push({ path: '/rmt/cases', label: 'All Cases' });
  }
  return base;
}
