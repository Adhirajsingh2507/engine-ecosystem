import { Vec3 } from "./vec3.ts";
import { Quaternion } from "./quaternion.ts";

/**
 * 4×4 matrix in **column-major** order (WebGL / gl-matrix convention): element
 * (row r, col c) lives at `e[c * 4 + r]`. Immutable. Right-handed, clip-space
 * z in [-1, 1] for the projection helpers.
 */
export class Mat4 {
  readonly e: readonly number[];

  constructor(elements?: readonly number[]) {
    if (elements) {
      if (elements.length !== 16) {
        throw new RangeError(`Mat4 needs 16 elements, got ${elements.length}`);
      }
      this.e = elements.slice();
    } else {
      this.e = IDENTITY;
    }
  }

  static identity(): Mat4 {
    return new Mat4(IDENTITY);
  }

  /** `this * b` (apply b first, then this). */
  multiply(b: Mat4): Mat4 {
    const a = this.e;
    const o = new Array<number>(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[0 * 4 + r] * b.e[c * 4 + 0] +
          a[1 * 4 + r] * b.e[c * 4 + 1] +
          a[2 * 4 + r] * b.e[c * 4 + 2] +
          a[3 * 4 + r] * b.e[c * 4 + 3];
      }
    }
    return new Mat4(o);
  }

  transpose(): Mat4 {
    const e = this.e;
    const o = new Array<number>(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = e[r * 4 + c];
      }
    }
    return new Mat4(o);
  }

  static translation(t: Vec3): Mat4 {
    const e = IDENTITY.slice();
    e[12] = t.x;
    e[13] = t.y;
    e[14] = t.z;
    return new Mat4(e);
  }

  static scaling(s: Vec3): Mat4 {
    const e = IDENTITY.slice();
    e[0] = s.x;
    e[5] = s.y;
    e[10] = s.z;
    return new Mat4(e);
  }

  /** Rotation matrix from a (unit) quaternion. */
  static fromQuaternion(q: Quaternion): Mat4 {
    const { x, y, z, w } = q;
    const x2 = x + x,
      y2 = y + y,
      z2 = z + z;
    const xx = x * x2,
      yx = y * x2,
      yy = y * y2,
      zx = z * x2,
      zy = z * y2,
      zz = z * z2;
    const wx = w * x2,
      wy = w * y2,
      wz = w * z2;
    return new Mat4([
      1 - yy - zz, yx + wz, zx - wy, 0,
      yx - wz, 1 - xx - zz, zy + wx, 0,
      zx + wy, zy - wx, 1 - xx - yy, 0,
      0, 0, 0, 1,
    ]);
  }

  /** Transform a point (implicit w = 1), with perspective divide. */
  transformPoint(v: Vec3): Vec3 {
    const e = this.e;
    const x = e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12];
    const y = e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13];
    const z = e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14];
    const w = e[3] * v.x + e[7] * v.y + e[11] * v.z + e[15];
    const iw = w === 0 ? 1 : 1 / w;
    return new Vec3(x * iw, y * iw, z * iw);
  }

  /** Transform a direction (implicit w = 0) — ignores translation. */
  transformDirection(v: Vec3): Vec3 {
    const e = this.e;
    return new Vec3(
      e[0] * v.x + e[4] * v.y + e[8] * v.z,
      e[1] * v.x + e[5] * v.y + e[9] * v.z,
      e[2] * v.x + e[6] * v.y + e[10] * v.z,
    );
  }

  determinant(): number {
    const m = this.e;
    const b0 = m[0] * m[5] - m[1] * m[4];
    const b1 = m[0] * m[6] - m[2] * m[4];
    const b2 = m[0] * m[7] - m[3] * m[4];
    const b3 = m[1] * m[6] - m[2] * m[5];
    const b4 = m[1] * m[7] - m[3] * m[5];
    const b5 = m[2] * m[7] - m[3] * m[6];
    const b6 = m[8] * m[13] - m[9] * m[12];
    const b7 = m[8] * m[14] - m[10] * m[12];
    const b8 = m[8] * m[15] - m[11] * m[12];
    const b9 = m[9] * m[14] - m[10] * m[13];
    const b10 = m[9] * m[15] - m[11] * m[13];
    const b11 = m[10] * m[15] - m[11] * m[14];
    return (
      b0 * b11 - b1 * b10 + b2 * b9 + b3 * b8 - b4 * b7 + b5 * b6
    );
  }

  /** Matrix inverse; returns null when singular (det ≈ 0). */
  inverse(): Mat4 | null {
    const m = this.e;
    const b0 = m[0] * m[5] - m[1] * m[4];
    const b1 = m[0] * m[6] - m[2] * m[4];
    const b2 = m[0] * m[7] - m[3] * m[4];
    const b3 = m[1] * m[6] - m[2] * m[5];
    const b4 = m[1] * m[7] - m[3] * m[5];
    const b5 = m[2] * m[7] - m[3] * m[6];
    const b6 = m[8] * m[13] - m[9] * m[12];
    const b7 = m[8] * m[14] - m[10] * m[12];
    const b8 = m[8] * m[15] - m[11] * m[12];
    const b9 = m[9] * m[14] - m[10] * m[13];
    const b10 = m[9] * m[15] - m[11] * m[13];
    const b11 = m[10] * m[15] - m[11] * m[14];
    const det =
      b0 * b11 - b1 * b10 + b2 * b9 + b3 * b8 - b4 * b7 + b5 * b6;
    if (Math.abs(det) < 1e-12) return null;
    const id = 1 / det;
    return new Mat4([
      (m[5] * b11 - m[6] * b10 + m[7] * b9) * id,
      (m[2] * b10 - m[1] * b11 - m[3] * b9) * id,
      (m[13] * b5 - m[14] * b4 + m[15] * b3) * id,
      (m[10] * b4 - m[9] * b5 - m[11] * b3) * id,
      (m[6] * b8 - m[4] * b11 - m[7] * b7) * id,
      (m[0] * b11 - m[2] * b8 + m[3] * b7) * id,
      (m[14] * b2 - m[12] * b5 - m[15] * b1) * id,
      (m[8] * b5 - m[10] * b2 + m[11] * b1) * id,
      (m[4] * b10 - m[5] * b8 + m[7] * b6) * id,
      (m[1] * b8 - m[0] * b10 - m[3] * b6) * id,
      (m[12] * b4 - m[13] * b2 + m[15] * b0) * id,
      (m[9] * b2 - m[8] * b4 - m[11] * b0) * id,
      (m[5] * b7 - m[4] * b9 - m[6] * b6) * id,
      (m[0] * b9 - m[1] * b7 + m[2] * b6) * id,
      (m[13] * b1 - m[12] * b3 - m[14] * b0) * id,
      (m[8] * b3 - m[9] * b1 + m[10] * b0) * id,
    ]);
  }

  /** Right-handed perspective projection; z clip range [-1, 1]. */
  static perspective(fovYRadians: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovYRadians / 2);
    const nf = 1 / (near - far);
    return new Mat4([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ]);
  }

  /** Right-handed orthographic projection; z clip range [-1, 1]. */
  static orthographic(
    left: number, right: number, bottom: number, top: number, near: number, far: number,
  ): Mat4 {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    return new Mat4([
      -2 * lr, 0, 0, 0,
      0, -2 * bt, 0, 0,
      0, 0, 2 * nf, 0,
      (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1,
    ]);
  }

  /** Right-handed view matrix looking from `eye` toward `center`. */
  static lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
    const z = eye.sub(center).normalize(); // forward (points back toward eye)
    const x = up.cross(z).normalize(); // right
    const y = z.cross(x); // true up
    return new Mat4([
      x.x, y.x, z.x, 0,
      x.y, y.y, z.y, 0,
      x.z, y.z, z.z, 0,
      -x.dot(eye), -y.dot(eye), -z.dot(eye), 1,
    ]);
  }

  equals(m: Mat4, eps = 1e-6): boolean {
    for (let i = 0; i < 16; i++) {
      if (Math.abs(this.e[i] - m.e[i]) > eps) return false;
    }
    return true;
  }

  toArray(): number[] {
    return this.e.slice();
  }
}

const IDENTITY: readonly number[] = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];
