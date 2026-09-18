import { Vec3 } from "./vec3.ts";

/**
 * Unit quaternion for 3D rotation. Stored (x, y, z, w) with w the scalar part.
 * Immutable, like Vec3. Prefer these over Euler angles — no gimbal lock, clean
 * interpolation via slerp.
 */
export class Quaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static readonly identity = new Quaternion(0, 0, 0, 1);

  /** Rotation of `angle` radians about a (assumed unit) `axis`. */
  static fromAxisAngle(axis: Vec3, angle: number): Quaternion {
    const half = angle / 2;
    const s = Math.sin(half);
    return new Quaternion(axis.x * s, axis.y * s, axis.z * s, Math.cos(half));
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  normalize(): Quaternion {
    const len = this.length();
    if (len === 0) return Quaternion.identity;
    const k = 1 / len;
    return new Quaternion(this.x * k, this.y * k, this.z * k, this.w * k);
  }

  /** Conjugate — the inverse for a unit quaternion. */
  conjugate(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }

  /** True inverse (conjugate / |q|²); handles non-unit quaternions too. */
  inverse(): Quaternion {
    const d = this.lengthSq();
    if (d === 0) return Quaternion.identity;
    const k = 1 / d;
    return new Quaternion(-this.x * k, -this.y * k, -this.z * k, this.w * k);
  }

  /** Hamilton product `this * q` — applies `q`'s rotation, then `this`'s. */
  multiply(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
    );
  }

  /** Rotate a vector by this (unit) quaternion: v + 2w(u×v) + 2(u×(u×v)). */
  rotate(v: Vec3): Vec3 {
    const u = new Vec3(this.x, this.y, this.z);
    const t = u.cross(v).scale(2);
    return v.add(t.scale(this.w)).add(u.cross(t));
  }

  /** Spherical linear interpolation; t is not clamped. Takes the short path. */
  slerp(q: Quaternion, t: number): Quaternion {
    let cos = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
    let end = q;
    if (cos < 0) {
      // go the short way round
      cos = -cos;
      end = new Quaternion(-q.x, -q.y, -q.z, -q.w);
    }
    if (cos > 0.9995) {
      // nearly parallel — linear interp then renormalize, avoids div-by-~0
      return new Quaternion(
        this.x + (end.x - this.x) * t,
        this.y + (end.y - this.y) * t,
        this.z + (end.z - this.z) * t,
        this.w + (end.w - this.w) * t,
      ).normalize();
    }
    const theta = Math.acos(cos);
    const sin = Math.sin(theta);
    const a = Math.sin((1 - t) * theta) / sin;
    const b = Math.sin(t * theta) / sin;
    return new Quaternion(
      this.x * a + end.x * b,
      this.y * a + end.y * b,
      this.z * a + end.z * b,
      this.w * a + end.w * b,
    );
  }

  equals(q: Quaternion, eps = 1e-6): boolean {
    return (
      Math.abs(this.x - q.x) < eps &&
      Math.abs(this.y - q.y) < eps &&
      Math.abs(this.z - q.z) < eps &&
      Math.abs(this.w - q.w) < eps
    );
  }
}
