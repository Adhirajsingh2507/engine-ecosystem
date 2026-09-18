import { Vec2 } from "./vec2.ts";
import { Mat3 } from "./mat3.ts";

/**
 * A 2D TRS transform: translation, rotation (radians), non-uniform scale.
 * Immutable. Composed matrix is T · R · S (scale first, then rotate, then
 * translate) — the 2D counterpart of Transform.
 */
export class Transform2D {
  readonly position: Vec2;
  readonly rotation: number;
  readonly scale: Vec2;

  constructor(position: Vec2 = Vec2.zero, rotation = 0, scale: Vec2 = Vec2.one) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }

  static readonly identity = new Transform2D();

  withPosition(position: Vec2): Transform2D {
    return new Transform2D(position, this.rotation, this.scale);
  }

  withRotation(rotation: number): Transform2D {
    return new Transform2D(this.position, rotation, this.scale);
  }

  withScale(scale: Vec2): Transform2D {
    return new Transform2D(this.position, this.rotation, scale);
  }

  /** Homogeneous model matrix M = T · R · S. */
  toMatrix(): Mat3 {
    return Mat3.translation2d(this.position)
      .multiply(Mat3.rotation2d(this.rotation))
      .multiply(Mat3.scaling2d(this.scale));
  }

  /** Apply to a point: scale, then rotate, then translate. */
  transformPoint(v: Vec2): Vec2 {
    const scaled = new Vec2(v.x * this.scale.x, v.y * this.scale.y);
    const c = Math.cos(this.rotation), s = Math.sin(this.rotation);
    return new Vec2(
      this.position.x + (scaled.x * c - scaled.y * s),
      this.position.y + (scaled.x * s + scaled.y * c),
    );
  }

  /** Apply to a direction: scale + rotate, no translation. */
  transformDirection(v: Vec2): Vec2 {
    const scaled = new Vec2(v.x * this.scale.x, v.y * this.scale.y);
    const c = Math.cos(this.rotation), s = Math.sin(this.rotation);
    return new Vec2(scaled.x * c - scaled.y * s, scaled.x * s + scaled.y * c);
  }
}
