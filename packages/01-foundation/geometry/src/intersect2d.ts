import { Aabb2, Circle, Ray2 } from "./geometry2d.ts";

/**
 * 2D intersection / overlap tests, mirroring the 3D `intersect` module. Ray
 * casts return the nearest t ≥ 0 or null; overlap tests return a boolean.
 * Contact is inclusive (touching counts).
 */

/** Ray vs circle → nearest t ≥ 0, or null. */
export function rayCircle(ray: Ray2, c: Circle): number | null {
  const oc = ray.origin.sub(c.center);
  const b = oc.dot(ray.direction); // direction is unit
  const cc = oc.lengthSq() - c.radius * c.radius;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const sqrt = Math.sqrt(disc);
  const t0 = -b - sqrt;
  if (t0 >= 0) return t0;
  const t1 = -b + sqrt;
  return t1 >= 0 ? t1 : null;
}

/** Ray vs AABB2 (slab method) → entry t ≥ 0, or null. Origin-inside → 0. */
export function rayAabb2(ray: Ray2, box: Aabb2): number | null {
  const o = [ray.origin.x, ray.origin.y];
  const d = [ray.direction.x, ray.direction.y];
  const lo = [box.min.x, box.min.y];
  const hi = [box.max.x, box.max.y];
  let tmin = -Infinity;
  let tmax = Infinity;
  for (let i = 0; i < 2; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (o[i] < lo[i] || o[i] > hi[i]) return null;
    } else {
      const inv = 1 / d[i];
      let t1 = (lo[i] - o[i]) * inv;
      let t2 = (hi[i] - o[i]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : 0;
}

export function circleCircle(a: Circle, b: Circle): boolean {
  const r = a.radius + b.radius;
  return a.center.sub(b.center).lengthSq() <= r * r;
}

export function aabb2Aabb2(a: Aabb2, b: Aabb2): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y
  );
}

/** Circle vs AABB2: closest point on the box within the radius. */
export function circleAabb2(c: Circle, box: Aabb2): boolean {
  const closest = box.closestPoint(c.center);
  return c.center.sub(closest).lengthSq() <= c.radius * c.radius;
}
