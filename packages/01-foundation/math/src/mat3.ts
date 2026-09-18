import { Vec2 } from "./vec2.ts";
import { Vec3 } from "./vec3.ts";
import { Quaternion } from "./quaternion.ts";
import { Mat4 } from "./mat4.ts";

/**
 * 3×3 matrix in **column-major** order (matching Mat4): element (row r, col c)
 * lives at `e[c * 3 + r]`. Immutable.
 *
 * Two roles: a pure 3D linear map (rotation / inertia tensor / normal matrix),
 * and — via the `*2d` helpers — a 2D affine transform acting on homogeneous
 * (x, y, 1) points.
 */
export class Mat3 {
  readonly e: readonly number[];

  constructor(elements?: readonly number[]) {
    if (elements) {
      if (elements.length !== 9) {
        throw new RangeError(`Mat3 needs 9 elements, got ${elements.length}`);
      }
      this.e = elements.slice();
    } else {
      this.e = IDENTITY;
    }
  }

  static identity(): Mat3 {
    return new Mat3(IDENTITY);
  }

  /** Diagonal matrix — handy for a principal-axis inertia tensor. */
  static diagonal(x: number, y: number, z: number): Mat3 {
    return new Mat3([x, 0, 0, 0, y, 0, 0, 0, z]);
  }

  /** `this * b` (apply b first, then this). */
  multiply(b: Mat3): Mat3 {
    const a = this.e;
    const o = new Array<number>(9);
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        o[c * 3 + r] =
          a[0 * 3 + r] * b.e[c * 3 + 0] +
          a[1 * 3 + r] * b.e[c * 3 + 1] +
          a[2 * 3 + r] * b.e[c * 3 + 2];
      }
    }
    return new Mat3(o);
  }

  transpose(): Mat3 {
    const e = this.e;
    return new Mat3([e[0], e[3], e[6], e[1], e[4], e[7], e[2], e[5], e[8]]);
  }

  scale(s: number): Mat3 {
    return new Mat3(this.e.map((v) => v * s));
  }

  /** Matrix · column vector. */
  multiplyVec3(v: Vec3): Vec3 {
    const e = this.e;
    return new Vec3(
      e[0] * v.x + e[3] * v.y + e[6] * v.z,
      e[1] * v.x + e[4] * v.y + e[7] * v.z,
      e[2] * v.x + e[5] * v.y + e[8] * v.z,
    );
  }

  determinant(): number {
    const m = this.e;
    return (
      m[0] * (m[4] * m[8] - m[7] * m[5]) -
      m[3] * (m[1] * m[8] - m[7] * m[2]) +
      m[6] * (m[1] * m[5] - m[4] * m[2])
    );
  }

  /** Matrix inverse; returns null when singular (det ≈ 0). */
  inverse(): Mat3 | null {
    const m = this.e;
    const c00 = m[4] * m[8] - m[7] * m[5];
    const c01 = m[7] * m[2] - m[1] * m[8];
    const c02 = m[1] * m[5] - m[4] * m[2];
    const det = m[0] * c00 + m[3] * c01 + m[6] * c02;
    if (Math.abs(det) < 1e-12) return null;
    const id = 1 / det;
    // columns of the inverse are the cofactor rows / det (adjugate = cofactorᵀ)
    return new Mat3([
      c00 * id,
      c01 * id,
      c02 * id,
      (m[6] * m[5] - m[3] * m[8]) * id,
      (m[0] * m[8] - m[6] * m[2]) * id,
      (m[3] * m[2] - m[0] * m[5]) * id,
      (m[3] * m[7] - m[6] * m[4]) * id,
      (m[6] * m[1] - m[0] * m[7]) * id,
      (m[0] * m[4] - m[3] * m[1]) * id,
    ]);
  }

  /** Rotation matrix from a (unit) quaternion. Matches Mat4.fromQuaternion. */
  static fromQuaternion(q: Quaternion): Mat3 {
    const { x, y, z, w } = q;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, yx = y * x2, yy = y * y2, zx = z * x2, zy = z * y2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return new Mat3([
      1 - yy - zz, yx + wz, zx - wy,
      yx - wz, 1 - xx - zz, zy + wx,
      zx + wy, zy - wx, 1 - xx - yy,
    ]);
  }

  /** The upper-left 3×3 of a Mat4 (its linear part). */
  static fromMat4(m: Mat4): Mat3 {
    const e = m.e;
    return new Mat3([e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]]);
  }

  // ── 2D affine helpers: act on homogeneous (x, y, 1) ────────────────

  static translation2d(t: Vec2): Mat3 {
    return new Mat3([1, 0, 0, 0, 1, 0, t.x, t.y, 1]);
  }

  static rotation2d(angle: number): Mat3 {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Mat3([c, s, 0, -s, c, 0, 0, 0, 1]);
  }

  static scaling2d(s: Vec2): Mat3 {
    return new Mat3([s.x, 0, 0, 0, s.y, 0, 0, 0, 1]);
  }

  /** Transform a 2D point (implicit z = 1), with the homogeneous divide. */
  transformPoint2d(v: Vec2): Vec2 {
    const e = this.e;
    const x = e[0] * v.x + e[3] * v.y + e[6];
    const y = e[1] * v.x + e[4] * v.y + e[7];
    const w = e[2] * v.x + e[5] * v.y + e[8];
    const iw = w === 0 ? 1 : 1 / w;
    return new Vec2(x * iw, y * iw);
  }

  /** Transform a 2D direction (implicit z = 0) — ignores translation. */
  transformDirection2d(v: Vec2): Vec2 {
    const e = this.e;
    return new Vec2(e[0] * v.x + e[3] * v.y, e[1] * v.x + e[4] * v.y);
  }

  equals(m: Mat3, eps = 1e-6): boolean {
    for (let i = 0; i < 9; i++) if (Math.abs(this.e[i] - m.e[i]) > eps) return false;
    return true;
  }

  toArray(): number[] {
    return this.e.slice();
  }
}

const IDENTITY: readonly number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
