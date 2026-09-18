import { Vec3 } from "@engine/math";

/**
 * Reynolds steering behaviours. Each returns a steering force to add to an
 * agent's acceleration; clamp the result to `maxForce` and integrate as usual.
 */

/** Steer toward `target` at full `maxSpeed`. */
export function seek(position: Vec3, velocity: Vec3, target: Vec3, maxSpeed: number): Vec3 {
  const desired = target.sub(position).normalize().scale(maxSpeed);
  return desired.sub(velocity);
}

/** Steer directly away from `target`. */
export function flee(position: Vec3, velocity: Vec3, target: Vec3, maxSpeed: number): Vec3 {
  const desired = position.sub(target).normalize().scale(maxSpeed);
  return desired.sub(velocity);
}

/** Seek that eases to a stop within `slowRadius` of the target. */
export function arrive(
  position: Vec3,
  velocity: Vec3,
  target: Vec3,
  maxSpeed: number,
  slowRadius: number,
): Vec3 {
  const offset = target.sub(position);
  const dist = offset.length();
  if (dist < 1e-6) return velocity.scale(-1); // on target → cancel velocity
  const speed = dist < slowRadius ? maxSpeed * (dist / slowRadius) : maxSpeed;
  const desired = offset.scale(speed / dist);
  return desired.sub(velocity);
}

/** Clamp a steering force to a maximum magnitude. */
export function limitForce(force: Vec3, maxForce: number): Vec3 {
  const m = force.length();
  return m > maxForce ? force.scale(maxForce / m) : force;
}
