/**
 * Sectioned frame profiler. `begin(label)`/`end(label)` (or `measure`) record
 * durations per label; `stats` reports count/mean/min/max/last. The clock is
 * injectable so it can be tested deterministically (default `performance.now`).
 */
export interface SectionStats {
  count: number;
  last: number;
  mean: number;
  min: number;
  max: number;
}

export class Profiler {
  private readonly now: () => number;
  private readonly starts = new Map<string, number>();
  private readonly samples = new Map<string, number[]>();
  private readonly maxSamples: number;

  constructor(now: () => number = () => performance.now(), maxSamples = 240) {
    this.now = now;
    this.maxSamples = maxSamples;
  }

  begin(label: string): void {
    this.starts.set(label, this.now());
  }

  /** End a section and return its duration. Throws if it was never begun. */
  end(label: string): number {
    const start = this.starts.get(label);
    if (start === undefined) throw new Error(`end("${label}") without a matching begin`);
    this.starts.delete(label);
    const dur = this.now() - start;
    const bucket = this.samples.get(label) ?? [];
    bucket.push(dur);
    if (bucket.length > this.maxSamples) bucket.shift();
    this.samples.set(label, bucket);
    return dur;
  }

  /** Time a synchronous function under `label`; returns its result. */
  measure<T>(label: string, fn: () => T): T {
    this.begin(label);
    try {
      return fn();
    } finally {
      this.end(label);
    }
  }

  stats(label: string): SectionStats | null {
    const b = this.samples.get(label);
    if (!b || b.length === 0) return null;
    let sum = 0, min = Infinity, max = -Infinity;
    for (const d of b) { sum += d; if (d < min) min = d; if (d > max) max = d; }
    return { count: b.length, last: b[b.length - 1], mean: sum / b.length, min, max };
  }

  labels(): string[] {
    return [...this.samples.keys()];
  }

  reset(): void {
    this.starts.clear();
    this.samples.clear();
  }
}
