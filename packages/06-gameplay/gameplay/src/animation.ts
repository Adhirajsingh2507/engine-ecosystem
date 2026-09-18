import { lerp as lerpNum, type Easing } from "@engine/core";

/**
 * Keyframe animation. A `Track<T>` holds time-sorted keyframes and samples a
 * value at any time by interpolating the surrounding pair (with an optional
 * per-segment easing). Generic over the value type via a supplied lerp function,
 * so the same machinery drives numbers, vectors, colours, etc.
 */
export interface Keyframe<T> {
  time: number;
  value: T;
  /** Easing applied across the segment that STARTS at this key (default linear). */
  ease?: Easing;
}

export class Track<T> {
  private readonly keys: Keyframe<T>[];
  private readonly lerpFn: (a: T, b: T, t: number) => T;
  constructor(keys: Keyframe<T>[], lerpFn: (a: T, b: T, t: number) => T) {
    if (keys.length === 0) throw new RangeError("a Track needs at least one keyframe");
    this.keys = [...keys].sort((a, b) => a.time - b.time);
    this.lerpFn = lerpFn;
  }

  get duration(): number {
    return this.keys[this.keys.length - 1].time;
  }

  /** Value at `time`, clamped to the first/last key outside the range. */
  sample(time: number): T {
    const keys = this.keys;
    if (time <= keys[0].time) return keys[0].value;
    const last = keys[keys.length - 1];
    if (time >= last.time) return last.value;

    // linear scan is fine for typical clip sizes; binary-search if keys grow large
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].time <= time) i++;
    const k0 = keys[i];
    const k1 = keys[i + 1];
    const span = k1.time - k0.time;
    const localT = span === 0 ? 0 : (time - k0.time) / span;
    const eased = (k0.ease ?? ((t) => t))(localT);
    return this.lerpFn(k0.value, k1.value, eased);
  }
}

/** A number track. */
export const numberTrack = (keys: Keyframe<number>[]): Track<number> =>
  new Track(keys, lerpNum);

/**
 * A named bundle of number tracks — the simplest useful "animation clip".
 * `sample(t)` returns one value per track.
 */
export class Clip {
  private readonly tracks: Record<string, Track<number>>;
  constructor(tracks: Record<string, Track<number>>) {
    this.tracks = tracks;
  }

  get duration(): number {
    return Math.max(0, ...Object.values(this.tracks).map((t) => t.duration));
  }

  sample(time: number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [name, track] of Object.entries(this.tracks)) out[name] = track.sample(time);
    return out;
  }
}
