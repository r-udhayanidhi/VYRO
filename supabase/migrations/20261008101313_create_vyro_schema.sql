/*
# Create VYRO Core Schema

## Overview
Creates the foundational database schema for VYRO — Vigilant Rescue Operations.
This is a demo-mode disaster response platform with no authentication, so all
tables are single-tenant with anon+authenticated CRUD access.

## New Tables

1. **users** — Demo user profiles (not auth users; just role-based demo identities)
   - id (uuid, PK)
   - name (text)
   - role (text: family|rmt|rescue|hospital|shelter)
   - phone (text)
   - created_at (timestamptz)

2. **cases** — Missing person / SOS cases that move through the rescue chain
   - id (uuid, PK)
   - case_id (text, unique — human-readable ID like VYRO-2026-00142)
   - person_name (text)
   - age (int)
   - gender (text)
   - relationship (text)
   - last_seen_location (text)
   - last_seen_date (date)
   - last_seen_time (text)
   - clothing (text)
   - description (text)
   - priority (text: low|medium|high|critical)
   - status (text: REPORTED|ACKNOWLEDGED|RESCUE_ASSIGNED|EN_ROUTE|ON_SITE|HOSPITAL_TRANSFER|SHELTER_TRANSFER|REUNITED)
   - created_by (text — role label for demo)
   - created_at (timestamptz)
   - updated_at (timestamptz)

3. **case_events** — Transparent timeline events for each case
   - id (uuid, PK)
   - case_id (text — references cases.case_id)
   - actor_role (text)
   - action (text)
   - status (text)
   - description (text)
   - created_at (timestamptz)

4. **sos** — Emergency SOS alerts
   - id (uuid, PK)
   - case_id (text — references cases.case_id)
   - location (text)
   - description (text)
   - status (text)
   - created_at (timestamptz)

5. **rescue_assignments** — Rescue team assignments per case
   - id (uuid, PK)
   - case_id (text — references cases.case_id)
   - team_name (text)
   - status (text)
   - assigned_at (timestamptz)

6. **hospital_patients** — Hospital patient registrations
   - id (uuid, PK)
   - case_id (text)
   - patient_name (text)
   - age (int)
   - gender (text)
   - condition (text)
   - arrival_time (timestamptz)
   - created_at (timestamptz)

7. **shelters** — Shelter records (capacity + occupied)
   - id (uuid, PK)
   - name (text)
   - capacity (int)
   - occupied (int)
   - location (text)

## Security
All tables have RLS enabled with anon+authenticated full CRUD because this is a
demo application with no authentication — all data is intentionally public/shared.
USING(true) / WITH CHECK(true) is acceptable here per the single-tenant no-auth pattern.
*/

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  role text,
  phone text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE TO anon, authenticated USING (true);

-- 2. cases
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text UNIQUE NOT NULL,
  person_name text NOT NULL,
  age int,
  gender text,
  relationship text,
  last_seen_location text,
  last_seen_date date,
  last_seen_time text,
  clothing text,
  description text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'REPORTED',
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cases" ON cases;
CREATE POLICY "anon_select_cases" ON cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cases" ON cases;
CREATE POLICY "anon_insert_cases" ON cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cases" ON cases;
CREATE POLICY "anon_update_cases" ON cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cases" ON cases;
CREATE POLICY "anon_delete_cases" ON cases FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_case_id ON cases(case_id);

-- 3. case_events
CREATE TABLE IF NOT EXISTS case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text,
  actor_role text,
  action text,
  status text,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_case_events" ON case_events;
CREATE POLICY "anon_select_case_events" ON case_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_case_events" ON case_events;
CREATE POLICY "anon_insert_case_events" ON case_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_case_events" ON case_events;
CREATE POLICY "anon_update_case_events" ON case_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_case_events" ON case_events;
CREATE POLICY "anon_delete_case_events" ON case_events FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events(case_id);

-- 4. sos
CREATE TABLE IF NOT EXISTS sos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text,
  location text,
  description text,
  status text DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sos" ON sos;
CREATE POLICY "anon_select_sos" ON sos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sos" ON sos;
CREATE POLICY "anon_insert_sos" ON sos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sos" ON sos;
CREATE POLICY "anon_update_sos" ON sos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sos" ON sos;
CREATE POLICY "anon_delete_sos" ON sos FOR DELETE TO anon, authenticated USING (true);

-- 5. rescue_assignments
CREATE TABLE IF NOT EXISTS rescue_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text,
  team_name text,
  status text DEFAULT 'ASSIGNED',
  assigned_at timestamptz DEFAULT now()
);
ALTER TABLE rescue_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_rescue_assignments" ON rescue_assignments;
CREATE POLICY "anon_select_rescue_assignments" ON rescue_assignments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_rescue_assignments" ON rescue_assignments;
CREATE POLICY "anon_insert_rescue_assignments" ON rescue_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_rescue_assignments" ON rescue_assignments;
CREATE POLICY "anon_update_rescue_assignments" ON rescue_assignments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_rescue_assignments" ON rescue_assignments;
CREATE POLICY "anon_delete_rescue_assignments" ON rescue_assignments FOR DELETE TO anon, authenticated USING (true);

-- 6. hospital_patients
CREATE TABLE IF NOT EXISTS hospital_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text,
  patient_name text,
  age int,
  gender text,
  condition text,
  arrival_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hospital_patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_hospital_patients" ON hospital_patients;
CREATE POLICY "anon_select_hospital_patients" ON hospital_patients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_hospital_patients" ON hospital_patients;
CREATE POLICY "anon_insert_hospital_patients" ON hospital_patients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_hospital_patients" ON hospital_patients;
CREATE POLICY "anon_update_hospital_patients" ON hospital_patients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_hospital_patients" ON hospital_patients;
CREATE POLICY "anon_delete_hospital_patients" ON hospital_patients FOR DELETE TO anon, authenticated USING (true);

-- 7. shelters
CREATE TABLE IF NOT EXISTS shelters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  capacity int DEFAULT 100,
  occupied int DEFAULT 0,
  location text
);
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_shelters" ON shelters;
CREATE POLICY "anon_select_shelters" ON shelters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_shelters" ON shelters;
CREATE POLICY "anon_insert_shelters" ON shelters FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_shelters" ON shelters;
CREATE POLICY "anon_update_shelters" ON shelters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_shelters" ON shelters;
CREATE POLICY "anon_delete_shelters" ON shelters FOR DELETE TO anon, authenticated USING (true);

-- Insert a default shelter and rescue team for demo if empty
INSERT INTO shelters (name, capacity, occupied, location)
SELECT 'Central Relief Shelter', 200, 47, 'District HQ'
WHERE NOT EXISTS (SELECT 1 FROM shelters LIMIT 1);
