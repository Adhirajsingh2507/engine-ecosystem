import { Vec3 } from "./vec3.ts";

/**
 * Immutable 4D vector. Useful for homogeneous coordinates and RGBA colour.
 * Mirrors Vec3's API where it makes sense.
 */
export class Vec4 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;

  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static readonly zero = new Vec4(0, 0, 0, 0);

  static fromVec3(v: Vec3, w = 1): Vec4 {
    return new Vec4(v.x, v.y, v.z, w);
  }

  add(v: Vec4): Vec4 {
    return new Vec4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
  }

  sub(v: Vec4): Vec4 {
    return new Vec4(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
  }

  scale(s: number): Vec4 {
    return new Vec4(this.x * s, this.y * s, this.z * s, this.w * s);
  }

  dot(v: Vec4): number {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }

  lengthSq(): number {
    return this.dot(this);
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  normalize(): Vec4 {
    const len = this.length();
    return len === 0 ? Vec4.zero : this.scale(1 / len);
  }

  /** Drop w. When w ≠ 0 use `perspectiveDivide` instead. */
  xyz(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  /** Homogeneous → cartesian: (x,y,z,w) → (x/w, y/w, z/w). w=0 falls back to xyz. */
  perspectiveDivide(): Vec3 {
    const iw = this.w === 0 ? 1 : 1 / this.w;
    return new Vec3(this.x * iw, this.y * iw, this.z * iw);
  }

  equals(v: Vec4, eps = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) < eps &&
      Math.abs(this.y - v.y) < eps &&
      Math.abs(this.z - v.z) < eps &&
      Math.abs(this.w - v.w) < eps
    );
  }

  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }
}
