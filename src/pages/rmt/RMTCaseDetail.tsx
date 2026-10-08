import { CaseDetail } from '@/components/CaseDetail';
import { RMTActions, FieldStepButtons } from '@/components/CaseActions';
import type { CaseStatus } from '@/lib/constants';

const FIELD_STATUSES: CaseStatus[] = ['RESCUE_ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'LOCATED'];

export function RMTCaseDetail() {
  return (
    <CaseDetail
      role="rmt"
      renderActions={({ caseRecord, assignment, isSOS, refresh }) => (
        <div className="space-y-4">
          <RMTActions caseRecord={caseRecord} isSOS={isSOS} onDone={refresh} />
          {FIELD_STATUSES.includes(caseRecord.status as CaseStatus) && (
            <div className="rounded-lg border border-dashed border-slate-300 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Field status (RMT can update on the team’s behalf)
              </p>
              <FieldStepButtons
                caseRecord={caseRecord}
                assignment={assignment}
                actor="RMT"
                onDone={refresh}
              />
            </div>
          )}
        </div>
      )}
    />
  );
}
