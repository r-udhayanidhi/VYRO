import { db, DBError, USING_SUPABASE, isSchemaCurrent } from './db';
import {
  canTransition,
  generateCaseId,
  STATUS_LABELS,
  type CaseStatus,
  type Verification,
} from './constants';
import { coordsText } from './format';
import { GEO_REASON_TEXT } from './geo';
import type {
  CaseRecord,
  CaseEvent,
  SOSRecord,
  SOSActivation,
  RescueAssignment,
  HospitalPatient,
  Shelter,
  UserProfile,
  NewCaseInput,
  NewSOSInput,
  NewHospitalPatientInput,
} from './types';

export { USING_SUPABASE, isSchemaCurrent };

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export interface EventExtras {
  actorName?: string | null;
  location?: string | null;
  source?: string | null;
  verification?: Verification | null;
  /** Override the event time (used for the device-side SOS trigger time). */
  at?: string;
}

const DEFAULT_SOURCE: Record<string, string> = {
  Family: 'Family App',
  RMT: 'RMT Console',
  Rescue: 'Rescue Field App',
  Hospital: 'Hospital Desk',
  Shelter: 'Shelter Desk',
};

const DEFAULT_VERIFICATION: Record<string, Verification> = {
  Family: 'UNVERIFIED',
  RMT: 'RMT_VERIFIED',
  Rescue: 'FIELD_REPORTED',
  Hospital: 'FIELD_REPORTED',
  Shelter: 'FIELD_REPORTED',
};

export async function addCaseEvent(
  caseId: string,
  actorRole: string,
  action: string,
  status: CaseStatus,
  description: string,
  extras: EventExtras = {}
): Promise<CaseEvent> {
  const row: Record<string, unknown> = {
    case_id: caseId,
    actor_role: actorRole,
    action,
    status,
    description,
    actor_name: extras.actorName ?? null,
    location: extras.location ?? null,
    source: extras.source ?? DEFAULT_SOURCE[actorRole] ?? 'VYRO',
    verification: extras.verification ?? DEFAULT_VERIFICATION[actorRole] ?? 'SYSTEM',
  };
  if (extras.at) row.created_at = extras.at;
  return db.insert<CaseEvent>('case_events', row);
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function getCases(): Promise<CaseRecord[]> {
  return db.select<CaseRecord>('cases', { orderBy: 'created_at', ascending: false });
}

/** Cases belonging to a user. Legacy rows with no owner stay visible to every family user (demo continuity). */
export async function getCasesForUser(userId: string): Promise<CaseRecord[]> {
  const all = await getCases();
  return all.filter((c) => !c.user_id || c.user_id === userId);
}

export async function getCase(caseId: string): Promise<CaseRecord | null> {
  const rows = await db.select<CaseRecord>('cases', { match: { case_id: caseId } });
  return rows[0] ?? null;
}

export async function getCaseEvents(caseId: string): Promise<CaseEvent[]> {
  return db.select<CaseEvent>('case_events', {
    match: { case_id: caseId },
    orderBy: 'created_at',
    ascending: true,
  });
}

export async function getSOSRecords(): Promise<SOSRecord[]> {
  return db.select<SOSRecord>('sos', { orderBy: 'created_at', ascending: false });
}

export async function getSOSForCase(caseId: string): Promise<SOSRecord | null> {
  const rows = await db.select<SOSRecord>('sos', {
    match: { case_id: caseId },
    orderBy: 'created_at',
    ascending: false,
  });
  return rows[0] ?? null;
}

export async function getRescueAssignments(): Promise<RescueAssignment[]> {
  return db.select<RescueAssignment>('rescue_assignments', {
    orderBy: 'assigned_at',
    ascending: false,
  });
}

export async function getAssignmentForCase(caseId: string): Promise<RescueAssignment | null> {
  const rows = await db.select<RescueAssignment>('rescue_assignments', {
    match: { case_id: caseId },
    orderBy: 'assigned_at',
    ascending: false,
  });
  return rows[0] ?? null;
}

export interface CaseBoard {
  cases: CaseRecord[];
  sosByCase: Record<string, SOSRecord>;
  assignmentByCase: Record<string, RescueAssignment>;
}

/** Everything the RMT / Rescue lists need in one round trip. */
export async function getCaseBoard(): Promise<CaseBoard> {
  const [cases, sos, assignments] = await Promise.all([
    getCases(),
    getSOSRecords(),
    getRescueAssignments(),
  ]);
  const sosByCase: Record<string, SOSRecord> = {};
  for (const s of sos) if (!sosByCase[s.case_id]) sosByCase[s.case_id] = s; // newest first
  const assignmentByCase: Record<string, RescueAssignment> = {};
  for (const a of assignments) if (!assignmentByCase[a.case_id]) assignmentByCase[a.case_id] = a;
  return { cases, sosByCase, assignmentByCase };
}

export function isSOSCase(c: CaseRecord, sosByCase?: Record<string, SOSRecord>): boolean {
  return c.case_type === 'SOS' || Boolean(sosByCase?.[c.case_id]);
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

/** Best-effort: persists the demo identity. Never throws (must not block an SOS). */
export async function ensureUser(user: UserProfile): Promise<void> {
  try {
    const existing = await db.select<UserProfile>('users', { match: { id: user.id } });
    if (existing.length === 0) {
      await db.insert('users', { id: user.id, name: user.name, role: user.role, phone: user.phone });
    } else if (existing[0].name !== user.name || existing[0].phone !== user.phone) {
      await db.update('users', { id: user.id }, { name: user.name, phone: user.phone });
    }
  } catch (e) {
    console.warn('VYRO: could not persist user profile', e);
  }
}

/* ------------------------------------------------------------------ */
/* Case creation                                                       */
/* ------------------------------------------------------------------ */

async function insertCaseWithUniqueId(base: Record<string, unknown>): Promise<CaseRecord> {
  let lastErr: unknown;
  for (let i = 0; i < 6; i++) {
    try {
      return await db.insert<CaseRecord>('cases', { ...base, case_id: generateCaseId() });
    } catch (e) {
      if (e instanceof DBError && e.code === '23505') {
        lastErr = e; // case id collision — pick another
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Could not allocate a unique case ID');
}

export async function createCase(input: NewCaseInput): Promise<CaseRecord> {
  const record = await insertCaseWithUniqueId({
    person_name: input.person_name,
    age: input.age,
    gender: input.gender,
    relationship: input.relationship,
    last_seen_location: input.last_seen_location,
    last_seen_date: input.last_seen_date || null,
    last_seen_time: input.last_seen_time || null,
    clothing: input.clothing,
    description: input.description,
    priority: input.priority,
    status: 'REPORTED',
    created_by: input.created_by,
    case_type: 'MISSING_PERSON',
    user_id: input.user_id ?? null,
  });

  await addCaseEvent(
    record.case_id,
    'Family',
    'Reported Missing',
    'REPORTED',
    'Missing person report filed by family.',
    { location: input.last_seen_location || null, verification: 'UNVERIFIED' }
  );
  return record;
}

function sosLocationText(geo: NewSOSInput['geo']): string {
  return geo.status === 'SHARED'
    ? coordsText(geo.latitude, geo.longitude, geo.accuracy)
    : 'Location unavailable';
}

/**
 * 7-second SOS activation. Creates, in order: the CRITICAL case (status
 * SOS_SENT, visible to RMT immediately), the SOS record (with real GPS if
 * shared) and the first timeline event. Location failure never blocks this.
 */
export async function createSOS(input: NewSOSInput): Promise<SOSActivation> {
  const { user, geo, triggeredAt } = input;
  await ensureUser(user);

  const locText = sosLocationText(geo);
  const locNote =
    geo.status === 'UNAVAILABLE' ? ` Location unavailable (${GEO_REASON_TEXT[geo.reason]}).` : '';
  const trig = new Date(triggeredAt);

  const caseRecord = await insertCaseWithUniqueId({
    person_name: user.name,
    age: null,
    gender: null,
    relationship: 'Self (SOS)',
    last_seen_location: locText,
    last_seen_date: triggeredAt.slice(0, 10),
    last_seen_time: trig.toTimeString().slice(0, 5),
    clothing: null,
    description: `Emergency SOS triggered by 7-second hold.${locNote}`,
    priority: 'critical',
    status: 'SOS_SENT',
    created_by: 'family',
    case_type: 'SOS',
    user_id: user.id,
  });

  const sosRow = {
    case_id: caseRecord.case_id,
    user_id: user.id,
    location: locText,
    description: `Emergency SOS from ${user.name}.${locNote}${user.phone ? ` Contact: ${user.phone}` : ''}`,
    status: 'SOS_SENT',
    latitude: geo.status === 'SHARED' ? geo.latitude : null,
    longitude: geo.status === 'SHARED' ? geo.longitude : null,
    accuracy: geo.status === 'SHARED' ? geo.accuracy : null,
    location_status: geo.status,
    location_error: geo.status === 'UNAVAILABLE' ? geo.reason : null,
    location_captured_at: geo.status === 'SHARED' ? geo.capturedAt : null,
    triggered_at: triggeredAt,
    contact_phone: user.phone || null,
  };

  let sos: SOSRecord | null = null;
  let sosErr: unknown;
  for (let i = 0; i < 3 && !sos; i++) {
    try {
      sos = await db.insert<SOSRecord>('sos', sosRow);
    } catch (e) {
      sosErr = e;
    }
  }
  if (!sos) {
    throw new Error(
      `SOS case ${caseRecord.case_id} was created but its SOS record failed: ${
        sosErr instanceof Error ? sosErr.message : 'unknown error'
      }`
    );
  }

  try {
    await addCaseEvent(
      caseRecord.case_id,
      'Family',
      'Triggered Emergency SOS',
      'SOS_SENT',
      `${user.name} held the SOS button for 7 seconds.${locNote}`,
      {
        actorName: user.name,
        location: locText,
        source: 'Family App · 7-second hold',
        verification: geo.status === 'SHARED' ? 'DEVICE_GPS' : 'UNVERIFIED',
        at: triggeredAt,
      }
    );
  } catch (e) {
    // The case + SOS already exist and RMT can see them; don't fail the activation.
    console.error('VYRO: SOS created but first timeline event failed', e);
  }

  return { caseRecord, sos };
}

/* ------------------------------------------------------------------ */
/* Workflow                                                            */
/* ------------------------------------------------------------------ */

const ASSIGNMENT_STATUS_FOR: Partial<Record<CaseStatus, string>> = {
  EN_ROUTE: 'EN_ROUTE',
  ON_SITE: 'ON_SITE',
  LOCATED: 'LOCATED',
  HOSPITAL_TRANSFER: 'COMPLETED',
  SHELTER_TRANSFER: 'COMPLETED',
};

/**
 * The single place where a case moves state. Validates the transition, applies
 * it only if nobody else changed the case meanwhile, and writes the timeline
 * event.
 */
export async function updateCaseStatus(
  caseId: string,
  status: CaseStatus,
  actor: string,
  action: string,
  description: string,
  extras: EventExtras = {}
): Promise<CaseRecord> {
  const current = await getCase(caseId);
  if (!current) throw new Error(`Case ${caseId} not found`);

  const from = current.status as CaseStatus;
  if (!canTransition(from, status)) {
    throw new Error(
      `Cannot move ${caseId} from "${STATUS_LABELS[from] ?? from}" to "${STATUS_LABELS[status]}".`
    );
  }

  const updated = await db.update<CaseRecord>(
    'cases',
    { case_id: caseId, status: from },
    { status, updated_at: new Date().toISOString() }
  );
  if (updated.length === 0) {
    throw new Error(`${caseId} was just updated by someone else. Refresh and try again.`);
  }

  await addCaseEvent(caseId, actor, action, status, description, {
    location: current.last_seen_location,
    ...extras,
  });

  // Keep the satellite records in step (best-effort; the case row is the source of truth).
  try {
    const sos = await getSOSForCase(caseId);
    if (sos) await db.update('sos', { id: sos.id }, { status });
    const assignStatus = ASSIGNMENT_STATUS_FOR[status];
    if (assignStatus) {
      const a = await getAssignmentForCase(caseId);
      if (a) await db.update('rescue_assignments', { id: a.id }, { status: assignStatus });
    }
  } catch (e) {
    console.warn('VYRO: could not sync SOS/assignment status', e);
  }

  return updated[0];
}

export async function acknowledgeCase(caseId: string): Promise<CaseRecord> {
  const c = await getCase(caseId);
  const sos = c?.case_type === 'SOS' || Boolean(c && (await getSOSForCase(caseId)));
  return updateCaseStatus(
    caseId,
    'ACKNOWLEDGED',
    'RMT',
    sos ? 'SOS Acknowledged' : 'Case Acknowledged',
    sos
      ? 'RMT acknowledged the SOS and began triage.'
      : 'RMT acknowledged the case and began triage.'
  );
}

export async function assignRescue(caseId: string, teamName: string): Promise<RescueAssignment> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  if (!canTransition(c.status as CaseStatus, 'RESCUE_ASSIGNED')) {
    throw new Error('Acknowledge the case before assigning a rescue team.');
  }
  const assignment = await db.insert<RescueAssignment>('rescue_assignments', {
    case_id: caseId,
    team_name: teamName,
    status: 'ASSIGNED',
  });
  await updateCaseStatus(
    caseId,
    'RESCUE_ASSIGNED',
    'RMT',
    'Rescue Team Assigned',
    `${teamName} assigned to the case.`,
    { actorName: teamName }
  );
  return assignment;
}

/** Rescue team accepts the mission (timeline event only — status stays RESCUE_ASSIGNED). */
export async function acceptAssignment(caseId: string): Promise<RescueAssignment> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  if (c.status !== 'RESCUE_ASSIGNED') throw new Error('This case is not waiting for a rescue team.');
  const a = await getAssignmentForCase(caseId);
  if (!a) throw new Error('No rescue assignment found for this case.');
  if (a.status !== 'ASSIGNED') throw new Error('Mission already accepted.');
  const rows = await db.update<RescueAssignment>(
    'rescue_assignments',
    { id: a.id, status: 'ASSIGNED' },
    { status: 'ACCEPTED' }
  );
  if (rows.length === 0) throw new Error('Mission already accepted.');
  await addCaseEvent(
    caseId,
    'Rescue',
    'Mission Accepted',
    'RESCUE_ASSIGNED',
    `${a.team_name} accepted the mission.`,
    { actorName: a.team_name, location: c.last_seen_location }
  );
  return rows[0];
}

export async function markReunited(caseId: string): Promise<CaseRecord> {
  return updateCaseStatus(
    caseId,
    'REUNITED',
    'RMT',
    'Family Notified',
    'RMT verified the outcome. Family has been notified and the case is closed.',
    { verification: 'RMT_VERIFIED' }
  );
}

/* ------------------------------------------------------------------ */
/* Hospital + Shelter (same VYRO case id)                              */
/* ------------------------------------------------------------------ */

async function requireOpenCase(caseId: string): Promise<CaseRecord> {
  const id = caseId.trim();
  const c = await getCase(id);
  if (!c) throw new Error(`No case found with ID "${id}". Check the VYRO Case ID.`);
  if (c.status === 'REUNITED') throw new Error(`Case ${id} is already closed (reunited).`);
  return c;
}

export async function registerHospitalPatient(
  input: NewHospitalPatientInput
): Promise<HospitalPatient> {
  const c = await requireOpenCase(input.case_id);
  const patient = await db.insert<HospitalPatient>('hospital_patients', {
    case_id: c.case_id,
    patient_name: input.patient_name,
    age: input.age,
    gender: input.gender,
    condition: input.condition,
  });

  // Medical condition stays in hospital_patients — the shared timeline (which
  // families can read) only records that the person was admitted.
  const desc = `Patient registered at hospital: ${input.patient_name}.`;
  if (canTransition(c.status as CaseStatus, 'HOSPITAL_TRANSFER')) {
    await updateCaseStatus(c.case_id, 'HOSPITAL_TRANSFER', 'Hospital', 'Hospital Transfer', desc, {
      location: 'Hospital',
    });
  } else {
    await addCaseEvent(c.case_id, 'Hospital', 'Hospital Admission', c.status as CaseStatus, desc, {
      location: 'Hospital',
    });
  }
  return patient;
}

export async function getHospitalPatients(): Promise<HospitalPatient[]> {
  return db.select<HospitalPatient>('hospital_patients', {
    orderBy: 'created_at',
    ascending: false,
  });
}

export async function getShelters(): Promise<Shelter[]> {
  return db.select<Shelter>('shelters', { orderBy: 'name', ascending: true });
}

export async function updateShelterTransfer(
  caseId: string,
  shelterName: string
): Promise<CaseRecord> {
  const c = await requireOpenCase(caseId);
  const desc = `Transferred to ${shelterName}.`;
  if (canTransition(c.status as CaseStatus, 'SHELTER_TRANSFER')) {
    return updateCaseStatus(c.case_id, 'SHELTER_TRANSFER', 'Shelter', 'Shelter Transfer', desc, {
      location: shelterName,
    });
  }
  await addCaseEvent(c.case_id, 'Shelter', 'Shelter Arrival', c.status as CaseStatus, desc, {
    location: shelterName,
  });
  return c;
}

/**
 * Registers an arrival at a shelter. If a VYRO case id is given it is
 * validated FIRST (so a typo can't consume a bed) and the same case moves to
 * SHELTER_TRANSFER.
 */
export async function admitToShelter(input: {
  shelterId: string;
  personName: string;
  caseId?: string;
}): Promise<Shelter> {
  const shelters = await db.select<Shelter>('shelters', { match: { id: input.shelterId } });
  const shelter = shelters[0];
  if (!shelter) throw new Error('Shelter not found');
  if (shelter.occupied >= shelter.capacity) throw new Error(`${shelter.name} is at full capacity.`);

  const caseId = input.caseId?.trim();
  if (caseId) await requireOpenCase(caseId);

  const rows = await db.update<Shelter>(
    'shelters',
    { id: shelter.id, occupied: shelter.occupied },
    { occupied: shelter.occupied + 1 }
  );
  if (rows.length === 0) throw new Error('Shelter occupancy changed — please retry.');

  if (caseId) await updateShelterTransfer(caseId, shelter.name);
  return rows[0];
}
