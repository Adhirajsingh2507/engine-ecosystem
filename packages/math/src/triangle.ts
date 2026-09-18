import { Vec3 } from "./vec3.ts";
import { Ray } from "./geometry.ts";

/**
 * A triangle defined by three vertices in counter-clockwise winding order.
 * Face normal is computed on construction from the cross-product of two edges.
 */
export class Triangle {
  readonly v0: Vec3;
  readonly v1: Vec3;
  readonly v2: Vec3;
  readonly normal: Vec3;

  constructor(v0: Vec3, v1: Vec3, v2: Vec3) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    const e1 = v1.sub(v0);
    const e2 = v2.sub(v0);
    this.normal = e1.cross(e2).normalize();
  }
}

/**
 * Result of a ray–triangle intersection.
 * `t` is the ray parameter, `u` and `v` are barycentric coordinates
 * (w = 1 - u - v for the weight on v0).
 */
export interface TriHit {
  t: number;
  u: number;
  v: number;
}

const EPS = 1e-8;

/**
 * Möller–Trumbore ray–triangle intersection.
 * Returns {t, u, v} if the ray hits the triangle with t > 0, else null.
 * Culls back-faces when `cullBack` is true (default: false = double-sided).
 */
export function rayTriangle(
  ray: Ray,
  tri: Triangle,
  cullBack = false,
): TriHit | null {
  const e1 = tri.v1.sub(tri.v0);
  const e2 = tri.v2.sub(tri.v0);
  const h = ray.direction.cross(e2);
  const a = e1.dot(h);

  if (cullBack) {
    if (a < EPS) return null; // parallel or back-face
  } else {
    if (a > -EPS && a < EPS) return null; // parallel
  }

  const f = 1 / a;
  const s = ray.origin.sub(tri.v0);
  const u = f * s.dot(h);
  if (u < 0 || u > 1) return null;

  const q = s.cross(e1);
  const v = f * ray.direction.dot(q);
  if (v < 0 || u + v > 1) return null;

  const t = f * e2.dot(q);
  if (t <= EPS) return null; // intersection behind the origin

  return { t, u, v };
}
