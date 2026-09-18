import { Vec3 } from "./vec3.ts";
import { Quaternion } from "./quaternion.ts";
import { Mat4 } from "./mat4.ts";

/**
 * A TRS transform: translation, rotation (quaternion), and non-uniform scale.
 * Immutable. The composed matrix is T · R · S — scale is applied first, then
 * rotation, then translation, matching how points flow through transformPoint().
 */
export class Transform {
  readonly position: Vec3;
  readonly rotation: Quaternion;
  readonly scale: Vec3;

  constructor(
    position: Vec3 = Vec3.zero,
    rotation: Quaternion = Quaternion.identity,
    scale: Vec3 = Vec3.one,
  ) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }

  static readonly identity = new Transform();

  withPosition(position: Vec3): Transform {
    return new Transform(position, this.rotation, this.scale);
  }

  withRotation(rotation: Quaternion): Transform {
    return new Transform(this.position, rotation, this.scale);
  }

  withScale(scale: Vec3): Transform {
    return new Transform(this.position, this.rotation, scale);
  }

  /** Column-major model matrix M = T · R · S. */
  toMatrix(): Mat4 {
    return Mat4.translation(this.position)
      .multiply(Mat4.fromQuaternion(this.rotation))
      .multiply(Mat4.scaling(this.scale));
  }

  /** Apply to a point: scale, then rotate, then translate. */
  transformPoint(v: Vec3): Vec3 {
    const scaled = new Vec3(v.x * this.scale.x, v.y * this.scale.y, v.z * this.scale.z);
    return this.position.add(this.rotation.rotate(scaled));
  }

  /** Apply to a direction: scale + rotate, but no translation. */
  transformDirection(v: Vec3): Vec3 {
    const scaled = new Vec3(v.x * this.scale.x, v.y * this.scale.y, v.z * this.scale.z);
    return this.rotation.rotate(scaled);
  }
}
