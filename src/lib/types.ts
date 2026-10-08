import type { CaseStatus, Priority, Verification } from './constants';

export type CaseType = 'MISSING_PERSON' | 'SOS';

export interface CaseRecord {
  id: string;
  case_id: string;
  person_name: string;
  age: number | null;
  gender: string | null;
  relationship: string | null;
  last_seen_location: string | null;
  last_seen_date: string | null;
  last_seen_time: string | null;
  clothing: string | null;
  description: string | null;
  priority: Priority;
  status: CaseStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Added by 20261008120000_vyro_sos_core.sql — may be absent on an un-migrated DB. */
  case_type?: CaseType | null;
  user_id?: string | null;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  actor_role: string;
  action: string;
  status: CaseStatus;
  description: string;
  created_at: string;
  /** WHO (name / unit). actor_role is the role. */
  actor_name?: string | null;
  /** WHERE */
  location?: string | null;
  /** SOURCE (device / app / system) */
  source?: string | null;
  verification?: Verification | null;
}

export type LocationStatus = 'SHARED' | 'UNAVAILABLE';

export interface SOSRecord {
  id: string;
  case_id: string;
  location: string;
  description: string;
  status: string;
  created_at: string;
  user_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  location_status?: LocationStatus | null;
  location_error?: string | null;
  location_captured_at?: string | null;
  triggered_at?: string | null;
  contact_phone?: string | null;
}

export interface RescueAssignment {
  id: string;
  case_id: string;
  team_name: string;
  status: string;
  assigned_at: string;
}

export interface HospitalPatient {
  id: string;
  case_id: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  condition: string;
  arrival_time: string;
  created_at: string;
}

export interface Shelter {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  location: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  phone: string;
  created_at?: string;
}

export interface NewCaseInput {
  person_name: string;
  age: number | null;
  gender: string;
  relationship: string;
  last_seen_location: string;
  last_seen_date: string;
  last_seen_time: string;
  clothing: string;
  description: string;
  priority: Priority;
  created_by: string;
  user_id?: string | null;
}

/** Result of a geolocation attempt. Never contains invented coordinates. */
export type GeoResult =
  | {
      status: 'SHARED';
      latitude: number;
      longitude: number;
      accuracy: number | null;
      /** ISO time of the GPS fix (from the device). */
      capturedAt: string;
    }
  | {
      status: 'UNAVAILABLE';
      reason: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';
    };

export interface NewSOSInput {
  user: UserProfile;
  geo: GeoResult;
  /** ISO time of the 7-second hold completing on the device. */
  triggeredAt: string;
}

export interface SOSActivation {
  caseRecord: CaseRecord;
  sos: SOSRecord;
}

export interface NewHospitalPatientInput {
  case_id: string;
  patient_name: string;
  age: number | null;
  gender: string;
  condition: string;
}
