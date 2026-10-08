import { MapPin, ExternalLink, AlertTriangle } from 'lucide-react';
import type { SOSRecord } from '@/lib/types';
import { coordsText, formatExact, hasCoords, osmEmbed, osmLink } from '@/lib/format';
import { GEO_REASON_TEXT } from '@/lib/geo';

/** Shows real GPS (if shared) or a clear "unavailable" marker. Never invents coordinates. */
export function SOSLocation({
  sos,
  embed = false,
  compact = false,
}: {
  sos?: SOSRecord | null;
  embed?: boolean;
  compact?: boolean;
}) {
  if (!sos) return null;

  if (!hasCoords(sos)) {
    const reason = sos.location_error
      ? GEO_REASON_TEXT[sos.location_error as keyof typeof GEO_REASON_TEXT] ?? sos.location_error
      : null;
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5" />
        Location unavailable{reason && !compact ? ` — ${reason}` : ''}
      </span>
    );
  }

  return (
    <div className={compact ? '' : 'space-y-2'}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-800">
          <MapPin className="h-3.5 w-3.5 text-red-500" />
          {coordsText(sos.latitude, sos.longitude, sos.accuracy)}
        </span>
        <a
          href={osmLink(sos.latitude, sos.longitude)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-navy-600 hover:text-navy-800"
        >
          Open map <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {!compact && sos.location_captured_at && (
        <p className="text-xs text-slate-500">GPS fix: {formatExact(sos.location_captured_at)}</p>
      )}
      {embed && (
        <iframe
          title="SOS location map"
          src={osmEmbed(sos.latitude, sos.longitude)}
          loading="lazy"
          className="h-56 w-full rounded-lg border border-slate-200"
        />
      )}
    </div>
  );
}
