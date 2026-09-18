/**
 * Field-level delta replication for flat numeric records — send only what
 * changed. `diff` returns the changed/added fields between two states; `apply`
 * patches a base with a delta. Keeps bandwidth proportional to change, not to
 * total state size.
 */
export type NumRecord = Record<string, number>;

/** Fields in `next` that differ from `prev` (added or changed). */
export function diff(prev: NumRecord, next: NumRecord): NumRecord {
  const out: NumRecord = {};
  for (const key in next) {
    if (next[key] !== prev[key]) out[key] = next[key];
  }
  return out;
}

/** Apply a delta onto a base state, returning a new record. */
export function apply(base: NumRecord, delta: NumRecord): NumRecord {
  return { ...base, ...delta };
}
