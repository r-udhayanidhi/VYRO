import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Radio,
  Ambulance,
  Building2,
  HeartHandshake,
  ArrowRight,
  Siren,
  Search,
} from 'lucide-react';
import { USING_SUPABASE } from '@/lib/services';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-red-400" />
          <span className="text-xl font-bold tracking-wide">VYRO</span>
        </div>
        <Link
          to="/login"
          className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
        >
          Enter Demo
        </Link>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 px-4 py-1.5 text-sm font-medium text-red-300">
          <Siren className="h-4 w-4" />
          Disaster Response Platform
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
          VYRO
        </h1>
        <p className="mt-2 text-lg text-slate-300 sm:text-2xl">
          Vigilant Rescue Operations
        </p>
        <p className="mt-6 text-lg font-medium text-amber-300 sm:text-xl">
          From Warning to Rescue. From Rescue to Reunion.
        </p>
        <p className="mx-auto mt-6 max-w-2xl text-slate-400">
          VYRO connects families, rescue teams, hospitals, and shelters through
          a single transparent chain — so that no missing person is lost in the
          chaos of a disaster.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-600"
          >
            Enter Demo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/family/report-missing"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold hover:bg-white/20"
          >
            <Search className="h-4 w-4" />
            Report Missing Person
          </Link>
          <Link
            to="/family/sos"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-navy-950 shadow-lg hover:bg-amber-400"
          >
            <Siren className="h-4 w-4" />
            Emergency SOS
          </Link>
        </div>

        {!USING_SUPABASE && (
          <p className="mt-6 text-xs text-slate-500">
            Running in Local Demo Mode
          </p>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-xl font-semibold text-slate-300">
          The Rescue Chain
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { icon: Users, label: 'Family', desc: 'Reports missing & SOS' },
            { icon: Radio, label: 'RMT', desc: 'Coordinates response' },
            { icon: HeartHandshake, label: 'Rescue', desc: 'Reaches the field' },
            { icon: Ambulance, label: 'Hospital', desc: 'Treats the injured' },
            { icon: Building2, label: 'Shelter', desc: 'Houses the displaced' },
          ].map((step, i) => (
            <div
              key={step.label}
              className="rounded-xl border border-white/10 bg-white/5 p-5 text-center"
            >
              <step.icon className="mx-auto h-8 w-8 text-red-400" />
              <p className="mt-3 text-sm font-semibold">{step.label}</p>
              <p className="mt-1 text-xs text-slate-400">{step.desc}</p>
              {i < 4 && (
                <div className="mt-3 text-slate-600">↓</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        VYRO © 2026 — Vigilant Rescue Operations
      </footer>
    </div>
  );
}
