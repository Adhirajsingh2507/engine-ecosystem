import { Vec3 } from "./vec3.ts";

/** A half-line: points origin + direction * t, for t ≥ 0. */
export class Ray {
  readonly origin: Vec3;
  readonly direction: Vec3;

  /** `direction` is normalized on construction. */
  constructor(origin: Vec3, direction: Vec3) {
    this.origin = origin;
    this.direction = direction.normalize();
  }

  at(t: number): Vec3 {
    return this.origin.add(this.direction.scale(t));
  }
}

/** Axis-aligned bounding box. */
export class Aabb {
  readonly min: Vec3;
  readonly max: Vec3;

  constructor(min: Vec3, max: Vec3) {
    this.min = min;
    this.max = max;
  }

  static fromCenter(center: Vec3, halfExtents: Vec3): Aabb {
    return new Aabb(center.sub(halfExtents), center.add(halfExtents));
  }

  center(): Vec3 {
    return this.min.add(this.max).scale(0.5);
  }

  containsPoint(p: Vec3): boolean {
    return (
      p.x >= this.min.x && p.x <= this.max.x &&
      p.y >= this.min.y && p.y <= this.max.y &&
      p.z >= this.min.z && p.z <= this.max.z
    );
  }

  /** The point inside/on the box nearest to `p` (p clamped into the box). */
  closestPoint(p: Vec3): Vec3 {
    const clamp = (v: number, lo: number, hi: number) =>
      v < lo ? lo : v > hi ? hi : v;
    return new Vec3(
      clamp(p.x, this.min.x, this.max.x),
      clamp(p.y, this.min.y, this.max.y),
      clamp(p.z, this.min.z, this.max.z),
    );
  }
}

/** Bounding sphere. */
export class Sphere {
  readonly center: Vec3;
  readonly radius: number;

  constructor(center: Vec3, radius: number) {
    this.center = center;
    this.radius = radius;
  }

  containsPoint(p: Vec3): boolean {
    return this.center.distanceTo(p) <= this.radius;
  }
}
