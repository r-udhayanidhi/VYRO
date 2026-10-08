/*
# VYRO core upgrade — 7-second SOS, GPS, richer case timeline

Additive only: no tables or columns are dropped or renamed, existing rows keep working.
Apply this BEFORE using the new SOS flow against a real Supabase project
(the app shows a banner and falls back to legacy columns until you do).

## cases
- case_type  text  — 'MISSING_PERSON' | 'SOS'   (replaces guessing from person_name)
- user_id    uuid  — owner (users.id) of the case; no FK so a missing users row can never block an SOS

## sos  (the SOS record; geo lives here, the case stays the single source of status)
- user_id, latitude, longitude, accuracy, location_status ('SHARED'|'UNAVAILABLE'),
  location_error, location_captured_at (device GPS fix time), triggered_at (device time the
  7-second hold completed), contact_phone

## case_events  (WHO / WHAT / WHEN / WHERE / SOURCE / STATUS / VERIFICATION)
- actor_name (WHO), location (WHERE), source (SOURCE), verification
  ('DEVICE_GPS' | 'SYSTEM' | 'UNVERIFIED' | 'FIELD_REPORTED' | 'RMT_VERIFIED')
  WHAT = action/description, WHEN = created_at, STATUS = status (all already existed).

## Statuses
cases.status / case_events.status / sos.status are free text. New values SOS_SENT and LOCATED
need no schema change.
*/

ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_type text DEFAULT 'MISSING_PERSON';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE cases SET case_type = 'SOS' WHERE person_name = 'SOS — Unknown' AND (case_type IS NULL OR case_type = 'MISSING_PERSON');
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);

ALTER TABLE sos ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE sos ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE sos ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE sos ADD COLUMN IF NOT EXISTS accuracy double precision;
ALTER TABLE sos ADD COLUMN IF NOT EXISTS location_status text;
ALTER TABLE sos ADD COLUMN IF NOT EXISTS location_error text;
ALTER TABLE sos ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;
ALTER TABLE sos ADD COLUMN IF NOT EXISTS triggered_at timestamptz;
ALTER TABLE sos ADD COLUMN IF NOT EXISTS contact_phone text;
CREATE INDEX IF NOT EXISTS idx_sos_case_id ON sos(case_id);

ALTER TABLE case_events ADD COLUMN IF NOT EXISTS actor_name text;
ALTER TABLE case_events ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE case_events ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE case_events ADD COLUMN IF NOT EXISTS verification text;

CREATE INDEX IF NOT EXISTS idx_rescue_assignments_case_id ON rescue_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_hospital_patients_case_id ON hospital_patients(case_id);

-- Make PostgREST pick up the new columns immediately.
NOTIFY pgrst, 'reload schema';
