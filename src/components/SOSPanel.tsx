import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { HoldToSOS } from '@/components/HoldToSOS';
import { CaseProgress } from '@/components/CaseProgress';
import { usePolling } from '@/hooks/usePolling';
import { createSOS, getCase } from '@/lib/services';
import { getCurrentLocation, getLocationPermission, GEO_REASON_TEXT, type PermissionState } from '@/lib/geo';
import { getCurrentUser } from '@/lib/session';
import { coordsText, formatExact } from '@/lib/format';
import { STATUS_LABELS, type CaseStatus } from '@/lib/constants';
import type { GeoResult, SOSActivation } from '@/lib/types';

type Phase = 'idle' | 'sending' | 'sent' | 'error';

export function SOSPanel({ onCreated }: { onCreated?: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<SOSActivation | null>(null);
  const [liveStatus, setLiveStatus] = useState<CaseStatus>('SOS_SENT');
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [geoBusy, setGeoBusy] = useState(false);
  // Kept so a failed send can be retried without making the user hold again.
  const pending = useRef<{ geo: GeoResult; triggeredAt: string } | null>(null);

  const refreshPermission = useCallback(() => {
    getLocationPermission().then(setPermission);
  }, []);
  useEffect(refreshPermission, [refreshPermission]);

  const send = useCallback(
    async (geo: GeoResult, triggeredAt: string) => {
      setPhase('sending');
      setError(null);
      try {
        const r = await createSOS({ user: getCurrentUser(), geo, triggeredAt });
        pending.current = null;
        setResult(r);
        setLiveStatus(r.caseRecord.status as CaseStatus);
        setPhase('sent');
        onCreated?.();
      } catch (e) {
        pending.current = { geo, triggeredAt };
        setError(e instanceof Error ? e.message : 'Could not send SOS');
        setPhase('error');
      }
    },
    [onCreated]
  );

  const activate = useCallback(
    async (triggeredAt: string) => {
      setPhase('sending');
      const geo = await getCurrentLocation(); // never rejects, never blocks the SOS
      refreshPermission();
      await send(geo, triggeredAt);
    },
    [send, refreshPermission]
  );

  // Live progression on the confirmation card.
  const poll = useCallback(async () => {
    if (!result) return;
    try {
      const c = await getCase(result.caseRecord.case_id);
      if (c) setLiveStatus(c.status as CaseStatus);
    } catch {
      /* keep last known status */
    }
  }, [result]);
  usePolling(poll, 4000);

  async function enableLocationNow() {
    setGeoBusy(true);
    await getCurrentLocation(10000);
    setGeoBusy(false);
    refreshPermission();
  }

  /* ------------------------------ sent ------------------------------ */
  if (phase === 'sent' && result) {
    const { caseRecord, sos } = result;
    const shared = sos.location_status === 'SHARED' && sos.latitude != null && sos.longitude != null;
    return (
      <div className="overflow-hidden rounded-2xl border-2 border-red-300 bg-white shadow-lg">
        <div className="bg-red-600 px-5 py-4 text-white">
          <p className="text-2xl font-extrabold">🚨 SOS SENT</p>
          <p className="text-sm text-red-100">Help has been requested. Keep your phone with you.</p>
        </div>
        <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
          <Field label="VYRO Case ID">
            <span className="font-mono text-base font-bold text-navy-900">{caseRecord.case_id}</span>
          </Field>
          <Field label="Status">
            <span className="font-bold text-red-700">{STATUS_LABELS[liveStatus].toUpperCase()}</span>
          </Field>
          <Field label="Location">
            {shared ? (
              <span className="font-semibold text-emerald-700">
                Shared
                <span className="block font-mono text-xs font-normal text-slate-500">
                  {coordsText(sos.latitude!, sos.longitude!, sos.accuracy)}
                </span>
              </span>
            ) : (
              <span className="font-semibold text-amber-700">
                Unavailable
                <span className="block text-xs font-normal text-slate-500">
                  {sos.location_error
                    ? GEO_REASON_TEXT[sos.location_error as keyof typeof GEO_REASON_TEXT] ?? sos.location_error
                    : 'RMT has been told your location is not known'}
                </span>
              </span>
            )}
          </Field>
          <Field label="Time">
            <span className="font-semibold text-slate-800">
              {formatExact(sos.triggered_at ?? sos.created_at)}
            </span>
          </Field>
          <Field label="RMT">
            <span className="font-semibold text-emerald-700">Notified</span>
          </Field>
        </dl>
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Live case progress
          </p>
          <CaseProgress status={liveStatus} />
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <Link
            to={`/family/cases/${caseRecord.case_id}`}
            className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Open case tracker
          </Link>
          <button
            onClick={() => {
              setResult(null);
              setPhase('idle');
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ sending ------------------------------ */
  if (phase === 'sending') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-6 py-12 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-red-600" />
        <p className="text-lg font-bold text-red-700">Sending SOS…</p>
        <p className="max-w-xs text-sm text-red-600">
          Getting your location and alerting the Rescue Management Team. If your browser asks for
          location access, please allow it — SOS will be sent either way.
        </p>
      </div>
    );
  }

  /* ------------------------------ idle / error ------------------------------ */
  return (
    <div className="rounded-2xl border border-red-200 bg-gradient-to-b from-red-50 to-white px-4 py-8 shadow-sm sm:px-8">
      {phase === 'error' && (
        <div className="mx-auto mb-6 max-w-md rounded-lg border border-red-300 bg-red-100 p-4 text-sm text-red-800">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" /> SOS could not be sent
          </p>
          <p className="mt-1">{error}</p>
          {pending.current && (
            <button
              onClick={() => send(pending.current!.geo, pending.current!.triggeredAt)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" /> Retry sending SOS
            </button>
          )}
        </div>
      )}

      <HoldToSOS onActivate={activate} />

      <div className="mx-auto mt-5 max-w-md text-center text-xs">
        {permission === 'granted' && (
          <p className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Location access is on — your GPS position will be shared.
          </p>
        )}
        {permission === 'prompt' && (
          <p className="text-slate-600">
            <MapPin className="mr-1 inline h-3.5 w-3.5" />
            Your browser will ask for location access.{' '}
            <button
              onClick={enableLocationNow}
              disabled={geoBusy}
              className="font-semibold text-navy-700 underline disabled:opacity-50"
            >
              {geoBusy ? 'Asking…' : 'Allow location now'}
            </button>{' '}
            so it is ready in an emergency.
          </p>
        )}
        {permission === 'denied' && (
          <p className="text-amber-700">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
            Location is blocked. SOS will still be sent, but marked “location unavailable”. Allow
            location in your browser settings to help rescuers find you.
          </p>
        )}
        {permission === 'unknown' && typeof window !== 'undefined' && !window.isSecureContext && (
          <p className="text-amber-700">
            Location needs a secure (HTTPS) connection. SOS will still be sent without it.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
