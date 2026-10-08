import assert from 'node:assert/strict';
import * as s from '../src/lib/services';
import { createHold } from '../src/lib/holdTimer';

const user = { id: crypto.randomUUID(), name: 'Asha', role: 'family', phone: '+91 90000 00000' };
let n = 0; const ok = (m: string) => console.log(`ok ${++n} - ${m}`);

// ---- 7s hold with fake clock ----
{
  let t = 0; const ticks: Array<() => void> = []; let to: (() => void) | null = null;
  let completed = 0, cancelled = 0;
  const mk = () => createHold({
    durationMs: 7000, onTick: () => {}, onComplete: () => completed++, onCancel: () => cancelled++,
    now: () => t, setIntervalFn: (cb) => { ticks.push(cb); return ticks.length; }, clearIntervalFn: () => { ticks.length = 0; },
    setTimeoutFn: (cb) => { to = cb; return 1; }, clearTimeoutFn: () => { to = null; },
  });
  // release at 6.9s -> cancel, never complete
  let h = mk(); h.start(); t = 6900; ticks[0]?.(); assert.equal(completed, 0); h.cancel();
  assert.equal(cancelled, 1); assert.equal(completed, 0); assert.equal(to, null); ok('release before 7s cancels');
  // quick tap
  t = 0; h = mk(); h.start(); t = 120; ticks[0]?.(); h.cancel(); assert.equal(completed, 0); ok('tap does not trigger');
  // full hold: tick at 6999 no, 7000 yes, exactly once even if backup timeout also fires
  t = 0; ticks.length = 0; h = mk(); h.start(); const backup = to!; const tick = ticks[0];
  t = 6999; tick(); assert.equal(completed, 0); t = 7000; tick(); assert.equal(completed, 1); backup(); tick(); assert.equal(completed, 1);
  ok('fires exactly once at 7000ms');
  // backup timeout path alone
  t = 0; ticks.length = 0; h = mk(); h.start(); to!(); assert.equal(completed, 2); ok('backup timeout completes if ticks throttled');
}

// ---- SOS with GPS ----
const a = await s.createSOS({ user, triggeredAt: new Date().toISOString(),
  geo: { status: 'SHARED', latitude: 11.7480, longitude: 79.7714, accuracy: 18.4, capturedAt: new Date().toISOString() } });
assert.match(a.caseRecord.case_id, /^VYRO-\d{4}-\d{5}$/);
assert.equal(a.caseRecord.priority, 'critical'); assert.equal(a.caseRecord.status, 'SOS_SENT');
assert.equal(a.caseRecord.user_id, user.id); assert.equal(a.sos.latitude, 11.748); assert.equal(a.sos.location_status, 'SHARED');
let ev = await s.getCaseEvents(a.caseRecord.case_id);
assert.equal(ev.length, 1); assert.equal(ev[0].action, 'Triggered Emergency SOS'); assert.equal(ev[0].verification, 'DEVICE_GPS'); assert.equal(ev[0].actor_name, 'Asha');
const board = await s.getCaseBoard(); assert.ok(board.cases.find(c => c.case_id === a.caseRecord.case_id)); assert.ok(board.sosByCase[a.caseRecord.case_id]);
assert.equal((await s.getCasesForUser(user.id)).some(c => c.case_id === a.caseRecord.case_id), true);
assert.equal((await s.getCasesForUser('someone-else')).some(c => c.case_id === a.caseRecord.case_id), false);
ok('SOS with GPS -> case, sos, event, visible to RMT board, scoped to user');

// ---- SOS without GPS ----
const b = await s.createSOS({ user, triggeredAt: new Date().toISOString(), geo: { status: 'UNAVAILABLE', reason: 'PERMISSION_DENIED' } });
assert.equal(b.sos.latitude, null); assert.equal(b.sos.location_status, 'UNAVAILABLE'); assert.equal(b.sos.location_error, 'PERMISSION_DENIED');
assert.equal(b.caseRecord.priority, 'critical'); assert.match(b.caseRecord.last_seen_location!, /unavailable/i);
ev = await s.getCaseEvents(b.caseRecord.case_id); assert.equal(ev[0].verification, 'UNVERIFIED');
ok('SOS still created when location denied; marked unavailable, no fake coords');
assert.notEqual(a.caseRecord.case_id, b.caseRecord.case_id);

// ---- RMT -> Rescue -> Hospital ----
const id = a.caseRecord.case_id;
await assert.rejects(s.assignRescue(id, 'Team Alpha'), /Acknowledge/); ok('cannot assign before ack');
await s.acknowledgeCase(id);
await assert.rejects(s.acknowledgeCase(id), /Cannot move/); ok('double ack rejected');
await s.assignRescue(id, 'Team Bravo');
await assert.rejects(s.updateCaseStatus(id, 'ON_SITE', 'Rescue', 'x', 'x'), /Cannot move/); ok('cannot skip en route');
await s.acceptAssignment(id);
await assert.rejects(s.acceptAssignment(id), /already accepted/);
await s.updateCaseStatus(id, 'EN_ROUTE', 'Rescue', 'En Route', 'Team en route.');
await s.updateCaseStatus(id, 'ON_SITE', 'Rescue', 'Reached Location', 'On site.');
await s.updateCaseStatus(id, 'LOCATED', 'Rescue', 'Person Located', 'Located.');
assert.equal((await s.getAssignmentForCase(id))!.status, 'LOCATED');
const p = await s.registerHospitalPatient({ case_id: id, patient_name: 'Asha', age: 30, gender: 'Female', condition: 'Critical - hypothermia' });
assert.equal(p.case_id, id);
let c = (await s.getCase(id))!; assert.equal(c.status, 'HOSPITAL_TRANSFER');
assert.equal((await s.getAssignmentForCase(id))!.status, 'COMPLETED');
assert.equal((await s.getSOSForCase(id))!.status, 'HOSPITAL_TRANSFER');
await assert.rejects(s.registerHospitalPatient({ case_id: 'VYRO-2026-99999', patient_name: 'x', age: null, gender: 'Male', condition: 'x' }), /No case found/); ok('hospital rejects unknown case id');
const shel = (await s.getShelters())[0];
await s.admitToShelter({ shelterId: shel.id, personName: 'Asha', caseId: id });
c = (await s.getCase(id))!; assert.equal(c.status, 'SHELTER_TRANSFER');
assert.equal((await s.getShelters())[0].occupied, shel.occupied + 1);
await assert.rejects(s.admitToShelter({ shelterId: shel.id, personName: 'x', caseId: 'VYRO-2026-00000' }), /No case found/);
assert.equal((await s.getShelters())[0].occupied, shel.occupied + 1); ok('bad case id does not consume a bed');
await s.markReunited(id);
await assert.rejects(s.registerHospitalPatient({ case_id: id, patient_name: 'x', age: null, gender: 'Male', condition: 'x' }), /closed/);
ev = await s.getCaseEvents(id);
console.log(ev.map(e => `${e.status.padEnd(18)} ${e.actor_role.padEnd(8)} ${e.action} | ${e.source} | ${e.verification} | ${e.location}`).join('\n'));
assert.deepEqual(ev.map(e => e.status), ['SOS_SENT','ACKNOWLEDGED','RESCUE_ASSIGNED','RESCUE_ASSIGNED','EN_ROUTE','ON_SITE','LOCATED','HOSPITAL_TRANSFER','SHELTER_TRANSFER','REUNITED']);
assert.ok(!ev.some(e => /hypothermia|Critical -/.test(e.description))); ok('full chain on ONE case id; every step has a timeline event; medical condition not in shared timeline');

// existing missing-person flow still works
const m = await s.createCase({ person_name: 'Ravi', age: 40, gender: 'Male', relationship: 'Father', last_seen_location: 'Pier', last_seen_date: '', last_seen_time: '', clothing: '', description: '', priority: 'high', created_by: 'family', user_id: user.id });
assert.equal(m.case_type, 'MISSING_PERSON'); await s.acknowledgeCase(m.case_id);
assert.equal((await s.getCaseEvents(m.case_id))[1].action, 'Case Acknowledged'); ok('missing-person flow unchanged');
// seed data still present
assert.ok(await s.getCase('VYRO-2026-00002')); await s.updateCaseStatus('VYRO-2026-00002','EN_ROUTE','Rescue','En Route','x'); ok('seed cases usable');
console.log('ALL PASSED');
