import { Vec3, Sphere, Aabb } from "@engine/math";

/**
 * A single contact between two shapes. `normal` is unit and points from the
 * first shape (a) toward the second (b) — i.e. the direction to push b to
 * separate them. `depth` ≥ 0 is the penetration along that normal.
 */
export interface Contact {
  normal: Vec3;
  depth: number;
  point: Vec3;
}

// arbitrary but stable normal for the degenerate concentric case
const FALLBACK_NORMAL = new Vec3(1, 0, 0);

/** Contact for a → b, or null when the spheres don't overlap. */
export function sphereSphereContact(a: Sphere, b: Sphere): Contact | null {
  const d = b.center.sub(a.center);
  const distSq = d.lengthSq();
  const r = a.radius + b.radius;
  if (distSq > r * r) return null;

  const dist = Math.sqrt(distSq);
  const normal = dist > 1e-9 ? d.scale(1 / dist) : FALLBACK_NORMAL;
  const depth = r - dist;
  const point = a.center.add(normal.scale(a.radius - depth / 2)); // middle of the overlap
  return { normal, depth, point };
}

/** Contact for sphere → box, or null when they don't overlap. */
export function sphereAabbContact(s: Sphere, box: Aabb): Contact | null {
  const closest = box.closestPoint(s.center);
  const d = s.center.sub(closest);
  const distSq = d.lengthSq();
  if (distSq > s.radius * s.radius) return null;

  if (distSq > 1e-18) {
    // center outside the box — normal runs along center ↔ closest surface point
    const dist = Math.sqrt(distSq);
    const normal = closest.sub(s.center).scale(1 / dist); // sphere → box
    return { normal, depth: s.radius - dist, point: closest };
  }

  // center inside the box — separate through the nearest face
  const faces = [
    { dist: s.center.x - box.min.x, normal: new Vec3(1, 0, 0), coord: box.min.x, axis: 0 },
    { dist: box.max.x - s.center.x, normal: new Vec3(-1, 0, 0), coord: box.max.x, axis: 0 },
    { dist: s.center.y - box.min.y, normal: new Vec3(0, 1, 0), coord: box.min.y, axis: 1 },
    { dist: box.max.y - s.center.y, normal: new Vec3(0, -1, 0), coord: box.max.y, axis: 1 },
    { dist: s.center.z - box.min.z, normal: new Vec3(0, 0, 1), coord: box.min.z, axis: 2 },
    { dist: box.max.z - s.center.z, normal: new Vec3(0, 0, -1), coord: box.max.z, axis: 2 },
  ];
  let best = faces[0];
  for (const f of faces) if (f.dist < best.dist) best = f;

  const c = s.center;
  const point =
    best.axis === 0 ? new Vec3(best.coord, c.y, c.z)
    : best.axis === 1 ? new Vec3(c.x, best.coord, c.z)
    : new Vec3(c.x, c.y, best.coord);
  return { normal: best.normal, depth: s.radius + best.dist, point };
}

/**
 * Contact for box a → box b (axis-aligned), or null when they don't overlap.
 * Separates along the axis of least penetration (minimum translation vector).
 */
export function aabbAabbContact(a: Aabb, b: Aabb): Contact | null {
  const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
  if (ox <= 0) return null;
  const oy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
  if (oy <= 0) return null;
  const oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
  if (oz <= 0) return null;

  const ca = a.center();
  const cb = b.center();
  const axis = (sign: number, x: number, y: number, z: number) =>
    new Vec3(sign * x, sign * y, sign * z);

  // pick the axis with the smallest overlap; normal points a → b along it
  let normal: Vec3;
  let depth: number;
  if (ox <= oy && ox <= oz) {
    normal = axis(cb.x >= ca.x ? 1 : -1, 1, 0, 0);
    depth = ox;
  } else if (oy <= oz) {
    normal = axis(cb.y >= ca.y ? 1 : -1, 0, 1, 0);
    depth = oy;
  } else {
    normal = axis(cb.z >= ca.z ? 1 : -1, 0, 0, 1);
    depth = oz;
  }

  // contact point: centre of the overlapping region
  const point = new Vec3(
    (Math.max(a.min.x, b.min.x) + Math.min(a.max.x, b.max.x)) / 2,
    (Math.max(a.min.y, b.min.y) + Math.min(a.max.y, b.max.y)) / 2,
    (Math.max(a.min.z, b.min.z) + Math.min(a.max.z, b.max.z)) / 2,
  );
  return { normal, depth, point };
}
