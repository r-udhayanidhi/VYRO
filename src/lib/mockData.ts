import type {
  CaseRecord,
  CaseEvent,
  SOSRecord,
  RescueAssignment,
  HospitalPatient,
  Shelter,
  UserProfile,
} from './types';

/** Seed data for local demo mode (used when Supabase env vars are missing). */
export interface MockTables {
  users: UserProfile[];
  cases: CaseRecord[];
  case_events: CaseEvent[];
  sos: SOSRecord[];
  rescue_assignments: RescueAssignment[];
  hospital_patients: HospitalPatient[];
  shelters: Shelter[];
}

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

export function createSeed(): MockTables {
  const mk = (
    case_id: string,
    base: Partial<CaseRecord>
  ): CaseRecord => ({
    id: crypto.randomUUID(),
    case_id,
    person_name: '',
    age: null,
    gender: null,
    relationship: null,
    last_seen_location: null,
    last_seen_date: null,
    last_seen_time: null,
    clothing: null,
    description: null,
    priority: 'medium',
    status: 'REPORTED',
    created_by: 'family',
    created_at: ago(0),
    updated_at: ago(0),
    case_type: 'MISSING_PERSON',
    user_id: null,
    ...base,
  });

  const ev = (
    case_id: string,
    actor_role: string,
    action: string,
    status: CaseEvent['status'],
    description: string,
    msAgo: number
  ): CaseEvent => ({
    id: crypto.randomUUID(),
    case_id,
    actor_role,
    action,
    status,
    description,
    created_at: ago(msAgo),
    actor_name: null,
    location: null,
    source: actor_role === 'Family' ? 'Family App' : 'RMT Console',
    verification: 'SYSTEM',
  });

  return {
    users: [],
    cases: [
      mk('VYRO-2026-00001', {
        person_name: 'Karthik Raman',
        age: 34,
        gender: 'Male',
        relationship: 'Brother',
        last_seen_location: 'Coastal Road, Sector 7',
        last_seen_date: '2026-10-07',
        last_seen_time: '14:30',
        clothing: 'Blue shirt, dark trousers',
        description: 'Was near the fishing harbor when the flood warning came.',
        priority: 'critical',
        status: 'ACKNOWLEDGED',
        created_at: ago(3600_000),
        updated_at: ago(3000_000),
      }),
      mk('VYRO-2026-00002', {
        person_name: 'Lakshmi Narayanan',
        age: 67,
        gender: 'Female',
        relationship: 'Grandmother',
        last_seen_location: 'Old Town, House 42',
        last_seen_date: '2026-10-07',
        last_seen_time: '13:00',
        clothing: 'White saree',
        description: 'Mobility issues, uses a walking stick.',
        priority: 'high',
        status: 'RESCUE_ASSIGNED',
        created_at: ago(7200_000),
        updated_at: ago(1800_000),
      }),
    ],
    case_events: [
      ev('VYRO-2026-00001', 'Family', 'Reported Missing', 'REPORTED', 'Missing person report filed by family.', 3600_000),
      ev('VYRO-2026-00001', 'RMT', 'Case Acknowledged', 'ACKNOWLEDGED', 'RMT acknowledged the case and began triage.', 3000_000),
      ev('VYRO-2026-00002', 'Family', 'Reported Missing', 'REPORTED', 'Missing person report filed by family.', 7200_000),
      ev('VYRO-2026-00002', 'RMT', 'Case Acknowledged', 'ACKNOWLEDGED', 'RMT acknowledged the case.', 5400_000),
      ev('VYRO-2026-00002', 'RMT', 'Rescue Team Assigned', 'RESCUE_ASSIGNED', 'Team Alpha assigned to the case.', 1800_000),
    ],
    sos: [],
    rescue_assignments: [
      {
        id: crypto.randomUUID(),
        case_id: 'VYRO-2026-00002',
        team_name: 'Team Alpha',
        status: 'ASSIGNED',
        assigned_at: ago(1800_000),
      },
    ],
    hospital_patients: [],
    shelters: [
      {
        id: crypto.randomUUID(),
        name: 'Central Relief Shelter',
        capacity: 200,
        occupied: 47,
        location: 'District HQ',
      },
    ],
  };
}
