import { Vec2 } from "@engine/math";

/**
 * Forward kinematics for a planar serial chain (relates to the TerraSight rover
 * arm / robotics track). Given per-joint link `lengths` and relative joint
 * `angles` (radians), returns the world position of the base and each joint tip.
 * Angles accumulate down the chain (each is relative to the previous link).
 */
export function forwardKinematics2D(lengths: number[], angles: number[]): Vec2[] {
  if (lengths.length !== angles.length) {
    throw new RangeError("lengths and angles must have the same length");
  }
  const joints: Vec2[] = [new Vec2(0, 0)];
  let angle = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < lengths.length; i++) {
    angle += angles[i];
    x += lengths[i] * Math.cos(angle);
    y += lengths[i] * Math.sin(angle);
    joints.push(new Vec2(x, y));
  }
  return joints;
}
