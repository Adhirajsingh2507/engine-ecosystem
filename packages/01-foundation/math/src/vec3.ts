/**
 * Immutable 3D vector. The bottom rung of the engine — physics, ECS, and the
 * renderer all build on this. Ops return new vectors (no aliasing bugs); add a
 * mutable fast-path only if a profiler says allocation here actually hurts.
 */
export class Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static readonly zero = new Vec3(0, 0, 0);
  static readonly one = new Vec3(1, 1, 1);

  add(v: Vec3): Vec3 {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vec3): Vec3 {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vec3 {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
    );
  }

  lengthSq(): number {
    return this.dot(this);
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  /** Unit vector. Returns zero for a zero-length vector rather than NaN. */
  normalize(): Vec3 {
    const len = this.length();
    return len === 0 ? Vec3.zero : this.scale(1 / len);
  }

  distanceTo(v: Vec3): number {
    return this.sub(v).length();
  }

  /** Linear interpolation; t is not clamped. */
  lerp(v: Vec3, t: number): Vec3 {
    return new Vec3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t,
    );
  }

  equals(v: Vec3, eps = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) < eps &&
      Math.abs(this.y - v.y) < eps &&
      Math.abs(this.z - v.z) < eps
    );
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }
}
