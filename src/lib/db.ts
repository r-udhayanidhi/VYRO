/**
 * Thin data-access layer. Two interchangeable backends expose the same tiny
 * API (select / insert / update) so ALL workflow logic lives once, in
 * services.ts, and behaves identically in Supabase and local demo mode.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { createSeed, type MockTables } from './mockData';

export type TableName = keyof MockTables;
type Row = Record<string, unknown>;

export interface DB {
  select<T>(
    table: TableName,
    opts?: { match?: Row; orderBy?: string; ascending?: boolean }
  ): Promise<T[]>;
  insert<T>(table: TableName, row: Row): Promise<T>;
  /** Updates every row matching `match`; returns the updated rows ([] if none matched). */
  update<T>(table: TableName, match: Row, patch: Row): Promise<T[]>;
}

export class DBError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* Local demo backend (in-memory, mirrored to localStorage so several  */
/* tabs — e.g. Family and RMT — can share one demo).                   */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'vyro_demo_db_v2';

function loadMock(): MockTables {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as MockTables;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return createSeed();
}

function persistMock(tables: MockTables) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
    }
  } catch {
    /* storage full / blocked: demo keeps working in memory */
  }
}

function createMockDB(): DB {
  let tables = loadMock();
  persistMock(tables);

  // Pick up writes made by other tabs.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          tables = JSON.parse(e.newValue) as MockTables;
        } catch {
          /* ignore */
        }
      }
    });
  }

  // Always start from the freshest copy (another tab may have written).
  function fresh(): MockTables {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) tables = JSON.parse(raw) as MockTables;
      }
    } catch {
      /* keep in-memory copy */
    }
    return tables;
  }

  const matches = (row: Row, match?: Row) =>
    !match || Object.entries(match).every(([k, v]) => row[k] === v);

  return {
    async select<T>(table: TableName, opts?: { match?: Row; orderBy?: string; ascending?: boolean }) {
      let rows = (fresh()[table] as unknown as Row[]).filter((r) => matches(r, opts?.match));
      if (opts?.orderBy) {
        const k = opts.orderBy;
        const dir = opts.ascending === false ? -1 : 1;
        rows = [...rows].sort((a, b) => (String(a[k] ?? '') < String(b[k] ?? '') ? -dir : String(a[k] ?? '') > String(b[k] ?? '') ? dir : 0));
      }
      return JSON.parse(JSON.stringify(rows)) as T[];
    },
    async insert<T>(table: TableName, row: Row) {
      const t = fresh();
      const list = t[table] as unknown as Row[];
      if (table === 'cases' && list.some((r) => r.case_id === row.case_id)) {
        throw new DBError('Duplicate case_id', '23505');
      }
      const now = new Date().toISOString();
      const full: Row = { id: crypto.randomUUID(), ...row };
      if (table === 'rescue_assignments') full.assigned_at ??= now;
      else if (table !== 'shelters') full.created_at ??= now;
      if (table === 'cases') full.updated_at ??= now;
      if (table === 'hospital_patients') full.arrival_time ??= now;
      list.push(full);
      persistMock(t);
      return JSON.parse(JSON.stringify(full)) as T;
    },
    async update<T>(table: TableName, match: Row, patch: Row) {
      const t = fresh();
      const hit = (t[table] as unknown as Row[]).filter((r) => matches(r, match));
      hit.forEach((r) => Object.assign(r, patch));
      if (hit.length) persistMock(t);
      return JSON.parse(JSON.stringify(hit)) as T[];
    },
  };
}

/* ------------------------------------------------------------------ */
/* Supabase backend                                                    */
/* ------------------------------------------------------------------ */

/**
 * Columns that existed before the SOS-core migration. If the migration has not
 * been applied yet, an insert that mentions a newer column is retried with only
 * these, so an emergency SOS is never lost to schema drift.
 */
const LEGACY_COLUMNS: Partial<Record<TableName, string[]>> = {
  cases: [
    'case_id', 'person_name', 'age', 'gender', 'relationship', 'last_seen_location',
    'last_seen_date', 'last_seen_time', 'clothing', 'description', 'priority', 'status', 'created_by',
  ],
  case_events: ['case_id', 'actor_role', 'action', 'status', 'description'],
  sos: ['case_id', 'location', 'description', 'status'],
};

export function isMissingColumnError(e: { code?: string; message?: string } | null | undefined): boolean {
  if (!e) return false;
  return (
    e.code === 'PGRST204' ||
    e.code === '42703' ||
    /could not find the .* column/i.test(e.message ?? '') ||
    /column .* does not exist/i.test(e.message ?? '')
  );
}

function createSupabaseDB(): DB {
  const sb = supabase!;
  const fail = (e: { message: string; code?: string }) => new DBError(e.message, e.code);

  return {
    async select<T>(table: TableName, opts?: { match?: Row; orderBy?: string; ascending?: boolean }) {
      let q = sb.from(table).select('*');
      if (opts?.match) {
        for (const [k, v] of Object.entries(opts.match)) q = q.eq(k, v as never);
      }
      if (opts?.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending !== false });
      const { data, error } = await q;
      if (error) throw fail(error);
      return (data ?? []) as T[];
    },
    async insert<T>(table: TableName, row: Row) {
      let { data, error } = await sb.from(table).insert(row).select().single();
      if (error && isMissingColumnError(error) && LEGACY_COLUMNS[table]) {
        const legacy = Object.fromEntries(
          Object.entries(row).filter(([k]) => LEGACY_COLUMNS[table]!.includes(k))
        );
        ({ data, error } = await sb.from(table).insert(legacy).select().single());
      }
      if (error) throw fail(error);
      return data as T;
    },
    async update<T>(table: TableName, match: Row, patch: Row) {
      let q = sb.from(table).update(patch);
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v as never);
      const { data, error } = await q.select();
      if (error) throw fail(error);
      return (data ?? []) as T[];
    },
  };
}

export const db: DB = isSupabaseConfigured ? createSupabaseDB() : createMockDB();
export const USING_SUPABASE = isSupabaseConfigured;

/** True when the SOS-core migration columns are present (always true in demo mode). */
export async function isSchemaCurrent(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  const { error } = await supabase!.from('cases').select('case_type').limit(1);
  return !isMissingColumnError(error);
}
