import { useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  acknowledgeCase,
  assignRescue,
  acceptAssignment,
  updateCaseStatus,
  markReunited,
} from '@/lib/services';
import { RESCUE_TEAMS, type CaseStatus } from '@/lib/constants';
import type { CaseRecord, RescueAssignment } from '@/lib/types';

type Msg = { type: 'ok' | 'err'; text: string } | null;

/** Runs an async action with busy + success/error feedback, then refreshes the caller. */
export function useActionRunner(onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const run = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      if (busy) return;
      setBusy(true);
      setMsg(null);
      try {
        await fn();
        setMsg({ type: 'ok', text: `${label} — done` });
        setTimeout(() => setMsg((m) => (m?.type === 'ok' ? null : m)), 3000);
      } catch (e) {
        setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Action failed' });
      } finally {
        setBusy(false);
        onDone?.();
      }
    },
    [busy, onDone]
  );
  return { busy, msg, run, setMsg };
}

export function ActionFeedback({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <div
      role="status"
      className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
        msg.type === 'ok'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {msg.text}
    </div>
  );
}

const COLORS: Record<string, string> = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  red: 'bg-red-600 hover:bg-red-700',
  cyan: 'bg-cyan-600 hover:bg-cyan-700',
  amber: 'bg-amber-500 hover:bg-amber-600',
  orange: 'bg-orange-500 hover:bg-orange-600',
  lime: 'bg-lime-600 hover:bg-lime-700',
  teal: 'bg-teal-600 hover:bg-teal-700',
  navy: 'bg-navy-700 hover:bg-navy-800',
};

export function ActionButton({
  label,
  color,
  onClick,
  disabled,
}: {
  label: string;
  color: keyof typeof COLORS;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${COLORS[color]}`}
    >
      {disabled && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </button>
  );
}

/** RMT: acknowledge → assign rescue team → close with family. */
export function RMTActions({
  caseRecord,
  isSOS,
  onDone,
}: {
  caseRecord: CaseRecord;
  isSOS: boolean;
  onDone?: () => void;
}) {
  const { busy, msg, run } = useActionRunner(onDone);
  const [team, setTeam] = useState('');
  const status = caseRecord.status as CaseStatus;
  const id = caseRecord.case_id;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {(status === 'REPORTED' || status === 'SOS_SENT') && (
          <ActionButton
            label={isSOS ? 'Acknowledge SOS' : 'Acknowledge Case'}
            color={isSOS ? 'red' : 'blue'}
            disabled={busy}
            onClick={() => run('Acknowledged', () => acknowledgeCase(id))}
          />
        )}

        {status === 'ACKNOWLEDGED' && (
          <>
            <select
              aria-label="Rescue team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none"
            >
              <option value="" disabled>
                Select team...
              </option>
              {RESCUE_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ActionButton
              label="Assign Rescue"
              color="cyan"
              disabled={busy}
              onClick={() => {
                if (!team) return run('Assign', async () => { throw new Error('Please select a rescue team first'); });
                run(`Rescue assigned: ${team}`, () => assignRescue(id, team));
              }}
            />
          </>
        )}

        {(status === 'HOSPITAL_TRANSFER' || status === 'SHELTER_TRANSFER') && (
          <ActionButton
            label="Verify & Notify Family"
            color="navy"
            disabled={busy}
            onClick={() => run('Family notified', () => markReunited(id))}
          />
        )}

        {status === 'REUNITED' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            Case complete — person reunited with family / safe.
          </div>
        )}
      </div>
      <ActionFeedback msg={msg} />
    </div>
  );
}

/**
 * Field progression: accept → en route → on site → located → hospital/shelter.
 * Used by the Rescue dashboard (actor "Rescue") and as an RMT override on the case page.
 */
export function FieldStepButtons({
  caseRecord,
  assignment,
  actor,
  onDone,
}: {
  caseRecord: CaseRecord;
  assignment?: RescueAssignment | null;
  actor: 'Rescue' | 'RMT';
  onDone?: () => void;
}) {
  const { busy, msg, run } = useActionRunner(onDone);
  const status = caseRecord.status as CaseStatus;
  const id = caseRecord.case_id;
  const team = assignment?.team_name ?? null;
  const by = actor === 'RMT' ? ' (RMT update)' : '';
  const step = (to: CaseStatus, action: string, desc: string) =>
    run(action, () =>
      updateCaseStatus(id, to, actor, `${action}${by}`, desc, {
        actorName: team,
        verification: actor === 'RMT' ? 'RMT_VERIFIED' : 'FIELD_REPORTED',
      })
    );

  const mustAccept = actor === 'Rescue' && assignment?.status === 'ASSIGNED';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === 'RESCUE_ASSIGNED' && mustAccept && (
          <ActionButton
            label="Accept Mission"
            color="cyan"
            disabled={busy}
            onClick={() => run('Mission accepted', () => acceptAssignment(id))}
          />
        )}
        {status === 'RESCUE_ASSIGNED' && !mustAccept && (
          <ActionButton
            label="Mark En Route"
            color="amber"
            disabled={busy}
            onClick={() => step('EN_ROUTE', 'En Route', `${team ?? 'Rescue team'} is en route to the location.`)}
          />
        )}
        {status === 'EN_ROUTE' && (
          <ActionButton
            label="Reached Location (On Site)"
            color="orange"
            disabled={busy}
            onClick={() => step('ON_SITE', 'Reached Location', `${team ?? 'Rescue team'} reached the location.`)}
          />
        )}
        {status === 'ON_SITE' && (
          <ActionButton
            label="Person Located"
            color="lime"
            disabled={busy}
            onClick={() => step('LOCATED', 'Person Located', `${team ?? 'Rescue team'} located the person.`)}
          />
        )}
        {status === 'LOCATED' && (
          <>
            <ActionButton
              label="Transfer to Hospital"
              color="red"
              disabled={busy}
              onClick={() => step('HOSPITAL_TRANSFER', 'Hospital Transfer', 'Person is being transferred to hospital.')}
            />
            <ActionButton
              label="Transfer to Shelter"
              color="teal"
              disabled={busy}
              onClick={() => step('SHELTER_TRANSFER', 'Shelter Transfer', 'Person is being transferred to a shelter.')}
            />
          </>
        )}
      </div>
      <ActionFeedback msg={msg} />
    </div>
  );
}
