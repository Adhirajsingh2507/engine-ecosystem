/**
 * Snapshot interpolation buffer for smoothing remote (replicated) state. Push
 * timestamped authoritative snapshots as they arrive; `sample(renderTime)` — with
 * renderTime held slightly in the past (the interpolation delay) — returns a
 * smoothly interpolated state between the two surrounding snapshots.
 */
export interface Snapshot<T> {
  time: number;
  state: T;
}

export class SnapshotBuffer<T> {
  private snaps: Snapshot<T>[] = [];
  private readonly lerpFn: (a: T, b: T, t: number) => T;
  private readonly maxAge: number;

  /**
   * @param lerpFn  interpolate two states (0…1)
   * @param maxAge  drop snapshots older than this many time units behind the newest
   */
  constructor(lerpFn: (a: T, b: T, t: number) => T, maxAge = 1000) {
    this.lerpFn = lerpFn;
    this.maxAge = maxAge;
  }

  /** Add a snapshot (kept time-sorted; stale ones pruned). */
  push(time: number, state: T): void {
    // fast path: newest append
    if (this.snaps.length === 0 || time >= this.snaps[this.snaps.length - 1].time) {
      this.snaps.push({ time, state });
    } else {
      let i = this.snaps.length;
      while (i > 0 && this.snaps[i - 1].time > time) i--;
      this.snaps.splice(i, 0, { time, state });
    }
    const cutoff = this.snaps[this.snaps.length - 1].time - this.maxAge;
    while (this.snaps.length > 2 && this.snaps[0].time < cutoff) this.snaps.shift();
  }

  /** Interpolated state at `renderTime`, or null if the buffer is empty. */
  sample(renderTime: number): T | null {
    const s = this.snaps;
    if (s.length === 0) return null;
    if (renderTime <= s[0].time) return s[0].state;
    const last = s[s.length - 1];
    if (renderTime >= last.time) return last.state;

    let i = 0;
    while (i < s.length - 1 && s[i + 1].time <= renderTime) i++;
    const a = s[i];
    const b = s[i + 1];
    const t = (renderTime - a.time) / (b.time - a.time);
    return this.lerpFn(a.state, b.state, t);
  }

  get size(): number {
    return this.snaps.length;
  }
}
