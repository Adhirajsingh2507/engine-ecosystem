import { Vec3, Quaternion, Transform, Mat3 } from "@engine/math";

/**
 * Collision shape carried by a body. Only these two are wired into the world's
 * collision pass, because they're the pairs the narrow phase actually handles
 * (sphere↔sphere, sphere↔box). A body with no collider still integrates but is
 * skipped by collision resolution.
 * ponytail: add capsule/box-box (SAT) here when a game needs stacked boxes.
 */
export type Collider =
  | { readonly kind: "sphere"; readonly radius: number }
  | { readonly kind: "box"; readonly halfExtents: Vec3 };

/**
 * A rigid body with linear AND angular dynamics. Mutable — a body IS its
 * evolving state. Integrated with semi-implicit Euler (velocity first, then
 * position/orientation), which is stable enough for games.
 *
 * Rotation supports either a **scalar (isotropic) inertia** (the default, correct
 * for a uniform sphere) or a **full inertia tensor** (`inertiaTensor`, a body-frame
 * Mat3) for non-spherical angular response. When a tensor is given, the world-space
 * inverse `Iinv_world = R·Iinv_body·Rᵀ` is rebuilt each step from the orientation.
 *
 * ponytail: no gyroscopic term (ω × Iω) — omitted as games usually do; add it if
 * free-tumbling asymmetric bodies need to precess correctly.
 *
 * mass 0 ⇒ static (inverseMass = inverseInertia = 0): forces and torques never
 * move it. A dynamic body may still lock rotation by passing inertia 0.
 */
export class RigidBody {
  position: Vec3;
  velocity: Vec3;
  orientation: Quaternion;
  angularVelocity: Vec3; // rad/s, world space

  readonly mass: number;
  readonly inverseMass: number;
  readonly inertia: number;
  readonly inverseInertia: number;
  /** Body-frame inverse inertia tensor when a full tensor was supplied, else undefined. */
  readonly inverseInertiaTensor?: Mat3;

  /** Collision shape, or undefined for a body the world's collision pass ignores. */
  readonly collider?: Collider;

  private force: Vec3 = Vec3.zero;
  private torque: Vec3 = Vec3.zero;

  constructor(
    opts: {
      position?: Vec3;
      velocity?: Vec3;
      orientation?: Quaternion;
      angularVelocity?: Vec3;
      mass?: number;
      /** Scalar moment of inertia. Defaults to `mass`; 0 locks rotation. */
      inertia?: number;
      /** Full body-frame inertia tensor; overrides the scalar `inertia` when set. */
      inertiaTensor?: Mat3;
      /** Collision shape; omit to exclude the body from collision. */
      collider?: Collider;
    } = {},
  ) {
    this.collider = opts.collider;
    this.position = opts.position ?? Vec3.zero;
    this.velocity = opts.velocity ?? Vec3.zero;
    this.orientation = opts.orientation ?? Quaternion.identity;
    this.angularVelocity = opts.angularVelocity ?? Vec3.zero;

    const mass = opts.mass ?? 1;
    if (mass < 0) throw new RangeError("mass must be ≥ 0");
    this.mass = mass;
    this.inverseMass = mass === 0 ? 0 : 1 / mass;

    const inertia = opts.inertia ?? mass; // sensible nonzero default for dynamic bodies
    if (inertia < 0) throw new RangeError("inertia must be ≥ 0");
    this.inertia = inertia;
    this.inverseInertia = mass === 0 || inertia === 0 ? 0 : 1 / inertia;

    if (opts.inertiaTensor && mass > 0) {
      const inv = opts.inertiaTensor.inverse();
      if (!inv) throw new RangeError("inertiaTensor must be invertible");
      this.inverseInertiaTensor = inv;
    }
  }

  /** World-space inverse inertia tensor `R·Iinv_body·Rᵀ` for the tensor path. */
  private worldInverseInertia(): Mat3 {
    const r = Mat3.fromQuaternion(this.orientation);
    return r.multiply(this.inverseInertiaTensor!).multiply(r.transpose());
  }

  get isStatic(): boolean {
    return this.inverseMass === 0;
  }

  /** Pose (position + orientation, unit scale) for the renderer / ECS. */
  get transform(): Transform {
    return new Transform(this.position, this.orientation, Vec3.one);
  }

  /** Queue a linear force (N) for the next integrate(). */
  applyForce(f: Vec3): void {
    this.force = this.force.add(f);
  }

  /** Queue a torque (N·m) for the next integrate(). */
  applyTorque(t: Vec3): void {
    this.torque = this.torque.add(t);
  }

  /** Advance by dt seconds; clears accumulated force and torque. */
  integrate(dt: number): void {
    if (this.inverseMass > 0) {
      const accel = this.force.scale(this.inverseMass);
      this.velocity = this.velocity.add(accel.scale(dt)); // v += a·dt
      this.position = this.position.add(this.velocity.scale(dt)); // x += v·dt
    }

    if (this.inverseInertiaTensor || this.inverseInertia > 0) {
      const angAccel = this.inverseInertiaTensor
        ? this.worldInverseInertia().multiplyVec3(this.torque)
        : this.torque.scale(this.inverseInertia);
      this.angularVelocity = this.angularVelocity.add(angAccel.scale(dt));
      // integrate the orientation quaternion: q += ½·dt·(ω⊗q), then renormalize
      const w = this.angularVelocity;
      const spin = new Quaternion(w.x, w.y, w.z, 0).multiply(this.orientation);
      const o = this.orientation;
      const h = 0.5 * dt;
      this.orientation = new Quaternion(
        o.x + h * spin.x,
        o.y + h * spin.y,
        o.z + h * spin.z,
        o.w + h * spin.w,
      ).normalize();
    }

    this.force = Vec3.zero;
    this.torque = Vec3.zero;
  }
}
