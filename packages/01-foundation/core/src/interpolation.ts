/** Scalar interpolation & remapping helpers used across procgen, animation, UI. */

export const TAU = Math.PI * 2;

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x;

export const clamp01 = (x: number): number => clamp(x, 0, 1);

/** Linear interpolation; t is not clamped. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Inverse lerp: where v sits between a and b, as 0…1. Returns 0 if a === b. */
export const invLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : (v - a) / (b - a);

/** Map v from [inMin,inMax] onto [outMin,outMax] (linear, unclamped). */
export const remap = (
  v: number, inMin: number, inMax: number, outMin: number, outMax: number,
): number => lerp(outMin, outMax, invLerp(inMin, inMax, v));

/** Hermite smoothstep, clamped to [0,1]. */
export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01(invLerp(edge0, edge1, x));
  return t * t * (3 - 2 * t);
};

/** Ken Perlin's smootherstep (C² continuous), clamped to [0,1]. */
export const smootherstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01(invLerp(edge0, edge1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Step `current` toward `target` by at most `maxDelta`. */
export const moveTowards = (current: number, target: number, maxDelta: number): number => {
  const d = target - current;
  return Math.abs(d) <= maxDelta ? target : current + Math.sign(d) * maxDelta;
};

/**
 * Frame-rate-independent exponential smoothing toward `target`. `lambda` is the
 * decay rate (larger = snappier); `dt` is the timestep. Unlike a raw lerp, the
 * result is the same whether you run at 30 or 144 fps.
 */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Bounce t back and forth in [0, length]. */
export const pingPong = (t: number, length: number): number => {
  const m = ((t % (2 * length)) + 2 * length) % (2 * length);
  return length - Math.abs(m - length);
};

/** Wrap an angle (radians) into (-π, π]. */
export const wrapAngle = (rad: number): number => {
  const a = ((rad + Math.PI) % TAU + TAU) % TAU;
  return a - Math.PI;
};
