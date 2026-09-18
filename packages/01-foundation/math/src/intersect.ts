import { Aabb, Ray, Sphere } from "./geometry.ts";

/**
 * Intersection / overlap tests. Ray casts return the distance `t` to the first
 * hit (t ≥ 0) or `null`; overlap tests return a boolean. Contact is inclusive
 * (touching counts as intersecting).
 */

/** Ray vs sphere → nearest t ≥ 0, or null. */
export function raySphere(ray: Ray, s: Sphere): number | null {
  const oc = ray.origin.sub(s.center);
  const b = oc.dot(ray.direction); // direction is unit → a = 1
  const c = oc.lengthSq() - s.radius * s.radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const sqrt = Math.sqrt(disc);
  const t0 = -b - sqrt;
  if (t0 >= 0) return t0;
  const t1 = -b + sqrt;
  return t1 >= 0 ? t1 : null; // both behind the origin
}

/** Ray vs AABB (slab method) → entry t ≥ 0, or null. Origin-inside → 0. */
export function rayAabb(ray: Ray, box: Aabb): number | null {
  const d = ray.direction;
  const o = ray.origin;
  let tmin = -Infinity;
  let tmax = Infinity;
  const lo = [box.min.x, box.min.y, box.min.z];
  const hi = [box.max.x, box.max.y, box.max.z];
  const oo = [o.x, o.y, o.z];
  const dd = [d.x, d.y, d.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dd[i]) < 1e-12) {
      // ray parallel to this slab: miss if origin outside the slab
      if (oo[i] < lo[i] || oo[i] > hi[i]) return null;
    } else {
      const inv = 1 / dd[i];
      let t1 = (lo[i] - oo[i]) * inv;
      let t2 = (hi[i] - oo[i]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  if (tmax < 0) return null; // box entirely behind the origin
  return tmin >= 0 ? tmin : 0; // 0 when the origin is inside the box
}

export function sphereSphere(a: Sphere, b: Sphere): boolean {
  const r = a.radius + b.radius;
  return a.center.sub(b.center).lengthSq() <= r * r;
}

export function aabbAabb(a: Aabb, b: Aabb): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

/** Sphere vs AABB: closest point on the box within the radius. */
export function sphereAabb(s: Sphere, box: Aabb): boolean {
  const closest = box.closestPoint(s.center);
  return s.center.sub(closest).lengthSq() <= s.radius * s.radius;
}
