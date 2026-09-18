import { Vec2 } from "@engine/math";

/** A 2D half-line: origin + direction * t, t ≥ 0. Direction normalized on build. */
export class Ray2 {
  readonly origin: Vec2;
  readonly direction: Vec2;

  constructor(origin: Vec2, direction: Vec2) {
    this.origin = origin;
    this.direction = direction.normalize();
  }

  at(t: number): Vec2 {
    return this.origin.add(this.direction.scale(t));
  }
}

/** Axis-aligned 2D box. */
export class Aabb2 {
  readonly min: Vec2;
  readonly max: Vec2;

  constructor(min: Vec2, max: Vec2) {
    this.min = min;
    this.max = max;
  }

  static fromCenter(center: Vec2, halfExtents: Vec2): Aabb2 {
    return new Aabb2(center.sub(halfExtents), center.add(halfExtents));
  }

  center(): Vec2 {
    return this.min.add(this.max).scale(0.5);
  }

  containsPoint(p: Vec2): boolean {
    return p.x >= this.min.x && p.x <= this.max.x && p.y >= this.min.y && p.y <= this.max.y;
  }

  /** The point inside/on the box nearest to `p`. */
  closestPoint(p: Vec2): Vec2 {
    const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
    return new Vec2(clamp(p.x, this.min.x, this.max.x), clamp(p.y, this.min.y, this.max.y));
  }
}

/** Circle — the 2D counterpart of Sphere. */
export class Circle {
  readonly center: Vec2;
  readonly radius: number;

  constructor(center: Vec2, radius: number) {
    this.center = center;
    this.radius = radius;
  }

  containsPoint(p: Vec2): boolean {
    return this.center.distanceTo(p) <= this.radius;
  }
}
