export const CASE_STATUSES = [
  'REPORTED',
  'SOS_SENT',
  'ACKNOWLEDGED',
  'RESCUE_ASSIGNED',
  'EN_ROUTE',
  'ON_SITE',
  'LOCATED',
  'HOSPITAL_TRANSFER',
  'SHELTER_TRANSFER',
  'REUNITED',
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ROLES = ['family', 'rmt', 'rescue', 'hospital', 'shelter'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  family: 'Family',
  rmt: 'RMT',
  rescue: 'Rescue',
  hospital: 'Hospital',
  shelter: 'Shelter',
};

export const STATUS_LABELS: Record<CaseStatus, string> = {
  REPORTED: 'Reported',
  SOS_SENT: 'SOS Sent',
  ACKNOWLEDGED: 'RMT Acknowledged',
  RESCUE_ASSIGNED: 'Rescue Assigned',
  EN_ROUTE: 'En Route',
  ON_SITE: 'On Site',
  LOCATED: 'Person Located',
  HOSPITAL_TRANSFER: 'Hospital Transfer',
  SHELTER_TRANSFER: 'Shelter Transfer',
  REUNITED: 'Reunited / Safe',
};

export const STATUS_COLORS: Record<CaseStatus, string> = {
  REPORTED: 'bg-slate-100 text-slate-700 border-slate-300',
  SOS_SENT: 'bg-red-100 text-red-700 border-red-300',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-700 border-blue-300',
  RESCUE_ASSIGNED: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  EN_ROUTE: 'bg-amber-100 text-amber-700 border-amber-300',
  ON_SITE: 'bg-orange-100 text-orange-700 border-orange-300',
  LOCATED: 'bg-lime-100 text-lime-700 border-lime-300',
  HOSPITAL_TRANSFER: 'bg-rose-100 text-rose-700 border-rose-300',
  SHELTER_TRANSFER: 'bg-teal-100 text-teal-700 border-teal-300',
  REUNITED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-300',
  medium: 'bg-blue-100 text-blue-700 border-blue-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-600 text-white border-red-700',
};

/**
 * Allowed status transitions. The whole VYRO chain goes through
 * updateCaseStatus(), so this is the single place that defines the workflow.
 */
export const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  REPORTED: ['ACKNOWLEDGED'],
  SOS_SENT: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['RESCUE_ASSIGNED'],
  RESCUE_ASSIGNED: ['EN_ROUTE'],
  EN_ROUTE: ['ON_SITE'],
  ON_SITE: ['LOCATED'],
  LOCATED: ['HOSPITAL_TRANSFER', 'SHELTER_TRANSFER'],
  HOSPITAL_TRANSFER: ['SHELTER_TRANSFER', 'REUNITED'],
  SHELTER_TRANSFER: ['REUNITED'],
  REUNITED: [],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Steps shown in the family-facing progression tracker. */
export const PROGRESS_STEPS: { key: string; label: string; statuses: CaseStatus[] }[] = [
  { key: 'sent', label: 'SOS Sent', statuses: ['SOS_SENT', 'REPORTED'] },
  { key: 'ack', label: 'RMT Acknowledged', statuses: ['ACKNOWLEDGED'] },
  { key: 'assigned', label: 'Rescue Assigned', statuses: ['RESCUE_ASSIGNED'] },
  { key: 'enroute', label: 'En Route', statuses: ['EN_ROUTE'] },
  { key: 'onsite', label: 'On Site', statuses: ['ON_SITE', 'LOCATED'] },
  { key: 'care', label: 'Hospital / Shelter', statuses: ['HOSPITAL_TRANSFER', 'SHELTER_TRANSFER'] },
  { key: 'safe', label: 'Reunited / Safe', statuses: ['REUNITED'] },
];

export function progressIndex(status: CaseStatus): number {
  const i = PROGRESS_STEPS.findIndex((s) => s.statuses.includes(status));
  return i < 0 ? 0 : i;
}

export const RESCUE_TEAMS = [
  'Team Alpha',
  'Team Bravo',
  'Team Delta',
  'Team Echo',
];

export const HOSPITALS = [
  { name: 'General Hospital', beds: 50 },
  { name: 'City Medical Center', beds: 30 },
];

export const VERIFICATION_LABELS = {
  DEVICE_GPS: 'Device GPS',
  SYSTEM: 'System generated',
  UNVERIFIED: 'Unverified',
  FIELD_REPORTED: 'Field reported',
  RMT_VERIFIED: 'RMT verified',
} as const;
export type Verification = keyof typeof VERIFICATION_LABELS;

export const SOS_HOLD_MS = 7000;

export function generateCaseId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `VYRO-${year}-${random}`;
}
