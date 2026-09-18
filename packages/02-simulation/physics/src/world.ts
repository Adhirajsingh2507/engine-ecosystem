import { Vec3 } from "@engine/math";
import { Aabb, Sphere } from "@engine/geometry";
import { RigidBody } from "./rigidbody.ts";
import { SpatialHash } from "./broadphase.ts";
import { sphereSphereContact, sphereAabbContact, aabbAabbContact, type Contact } from "./narrowphase.ts";
import { resolveContact } from "./solver.ts";

export interface WorldOptions {
  /** Bounciness applied to every contact, 0 (inelastic) … 1 (elastic). */
  restitution?: number;
  /** Coulomb friction coefficient applied to every contact. 0 = frictionless. */
  friction?: number;
  /** Solver passes per step. More = firmer stacks, more cost. */
  iterations?: number;
  /** Broad-phase grid cell size; pick near typical object diameter. */
  cellSize?: number;
}

/**
 * Holds bodies and steps them: gravity + integration, then a collision pass
 * (broad phase → narrow phase → impulse solver) over every body that carries a
 * collider. Bodies without a collider still integrate but pass through others.
 *
 * The collision pass handles sphere↔sphere and sphere↔box (a static box makes a
 * floor/wall). box↔box is skipped until a narrow phase for it exists.
 *
 * ponytail: single fixed grid + N solver iterations, no sleeping, no CCD.
 * Good for arcade-scale scenes; add an islands/BVH broadphase and CCD when a
 * game has many bodies or fast tunnelling.
 */
export class World {
  readonly gravity: Vec3;
  readonly bodies: RigidBody[] = [];
  readonly restitution: number;
  readonly friction: number;
  readonly iterations: number;
  readonly cellSize: number;

  constructor(gravity: Vec3 = new Vec3(0, -9.81, 0), opts: WorldOptions = {}) {
    this.gravity = gravity;
    this.restitution = opts.restitution ?? 0.2;
    this.friction = opts.friction ?? 0;
    this.iterations = opts.iterations ?? 1;
    this.cellSize = opts.cellSize ?? 2;
  }

  add(body: RigidBody): RigidBody {
    this.bodies.push(body);
    return body;
  }

  step(dt: number): void {
    for (const body of this.bodies) {
      if (!body.isStatic) body.applyForce(this.gravity.scale(body.mass));
      body.integrate(dt);
    }
    this.resolveCollisions();
  }

  /** Broad phase → narrow phase → impulse solve, over collidable bodies. */
  private resolveCollisions(): void {
    const collidable = this.bodies.filter((b) => b.collider);
    if (collidable.length < 2) return;

    const aabbs = collidable.map(colliderAabb);
    const pairs = new SpatialHash(this.cellSize).pairs(aabbs);

    for (let iter = 0; iter < this.iterations; iter++) {
      for (const [i, j] of pairs) {
        const a = collidable[i];
        const b = collidable[j];
        if (a.isStatic && b.isStatic) continue; // neither can move
        const contact = contactBetween(a, b);
        if (contact) resolveContact(a, b, contact, this.restitution, this.friction);
      }
    }
  }
}

/** World-space AABB of a body's collider, for the broad phase. */
function colliderAabb(b: RigidBody): Aabb {
  const c = b.collider!;
  const half = c.kind === "sphere" ? new Vec3(c.radius, c.radius, c.radius) : c.halfExtents;
  return Aabb.fromCenter(b.position, half);
}

/** Narrow-phase dispatch. Returns a contact with normal pointing a → b, or null. */
function contactBetween(a: RigidBody, b: RigidBody): Contact | null {
  const ca = a.collider!;
  const cb = b.collider!;

  if (ca.kind === "sphere" && cb.kind === "sphere") {
    return sphereSphereContact(new Sphere(a.position, ca.radius), new Sphere(b.position, cb.radius));
  }
  if (ca.kind === "sphere" && cb.kind === "box") {
    // sphereAabbContact returns normal sphere → box, i.e. a → b. Good as-is.
    return sphereAabbContact(new Sphere(a.position, ca.radius), Aabb.fromCenter(b.position, cb.halfExtents));
  }
  if (ca.kind === "box" && cb.kind === "sphere") {
    // compute sphere(b) → box(a), then flip the normal to get a → b
    const c = sphereAabbContact(new Sphere(b.position, cb.radius), Aabb.fromCenter(a.position, ca.halfExtents));
    return c ? { normal: c.normal.scale(-1), depth: c.depth, point: c.point } : null;
  }
  if (ca.kind === "box" && cb.kind === "box") {
    return aabbAabbContact(Aabb.fromCenter(a.position, ca.halfExtents), Aabb.fromCenter(b.position, cb.halfExtents));
  }
  return null;
}
