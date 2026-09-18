/**
 * Deterministic pseudo-random numbers. Same seed → same stream, on every machine
 * and run — essential for reproducible sims, procedural generation, and tests.
 * Uses mulberry32: tiny, fast, and good enough for games (not cryptographic).
 */

/** Functional PRNG: returns a closure producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private step: () => number;

  constructor(seed = 0x9e3779b9) {
    this.step = mulberry32(seed);
  }

  /** Float in [0, 1). */
  next(): number {
    return this.step();
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.step() * (max - min);
  }

  /** Integer in [min, max] (inclusive both ends). */
  int(min: number, max: number): number {
    return Math.floor(min + this.step() * (max - min + 1));
  }

  /** True with probability `p` (default ½). */
  bool(p = 0.5): boolean {
    return this.step() < p;
  }

  /** A uniformly-chosen element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError("pick from empty array");
    return items[this.int(0, items.length - 1)];
  }

  /** In-place Fisher–Yates shuffle; returns the same array for chaining. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  /** Standard-normal sample (Box–Muller), scaled to (mean, std). */
  gaussian(mean = 0, std = 1): number {
    // avoid log(0)
    const u1 = 1 - this.step();
    const u2 = this.step();
    const mag = Math.sqrt(-2 * Math.log(u1));
    return mean + std * mag * Math.cos(2 * Math.PI * u2);
  }
}
