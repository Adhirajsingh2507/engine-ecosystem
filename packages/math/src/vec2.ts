/**
 * Immutable 2D vector — the base for the engine's 2D path (Transform2D, 2D
 * geometry). Mirrors Vec3's API. Ops return new vectors.
 */
export class Vec2 {
  readonly x: number;
  readonly y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static readonly zero = new Vec2(0, 0);
  static readonly one = new Vec2(1, 1);

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  /** 2D cross product → the scalar z of the 3D cross (signed parallelogram area). */
  cross(v: Vec2): number {
    return this.x * v.y - this.y * v.x;
  }

  /** Left-hand perpendicular (−90°): (x, y) → (−y, x). */
  perp(): Vec2 {
    return new Vec2(-this.y, this.x);
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  /** Unit vector. Returns zero for a zero-length vector rather than NaN. */
  normalize(): Vec2 {
    const len = this.length();
    return len === 0 ? Vec2.zero : this.scale(1 / len);
  }

  distanceTo(v: Vec2): number {
    return this.sub(v).length();
  }

  /** Linear interpolation; t is not clamped. */
  lerp(v: Vec2, t: number): Vec2 {
    return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  equals(v: Vec2, eps = 1e-6): boolean {
    return Math.abs(this.x - v.x) < eps && Math.abs(this.y - v.y) < eps;
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }
}
