import { Vec3, Mat4 } from "@engine/math";
import type { Color } from "./color.ts";

/** Light types shared by all backends. Directions are unit; colours linear. */
export interface DirectionalLight {
  kind: "directional";
  direction: Vec3; // direction the light travels
  color: Color;
  intensity: number;
}

export interface PointLight {
  kind: "point";
  position: Vec3;
  color: Color;
  intensity: number;
  /** distance at which the light fully cuts off */
  range: number;
}

export interface SpotLight {
  kind: "spot";
  position: Vec3;
  direction: Vec3;
  color: Color;
  intensity: number;
  range: number;
  /** full-intensity cone half-angle (rad) */
  innerAngle: number;
  /** zero-intensity cone half-angle (rad) */
  outerAngle: number;
}

export type Light = DirectionalLight | PointLight | SpotLight;

/**
 * Windowed inverse-square attenuation (UE4-style): 1 at the source, smoothly
 * reaching exactly 0 at `range`. Monotonically decreasing.
 */
export function pointAttenuation(distance: number, range: number): number {
  if (distance >= range) return 0;
  const window = Math.max(0, 1 - Math.pow(distance / range, 4));
  return (window * window) / (distance * distance + 1);
}

/** Spot cone factor: 1 inside the inner angle, smooth to 0 at the outer angle. */
export function spotCone(spot: SpotLight, toFragment: Vec3): number {
  const cosAngle = spot.direction.normalize().dot(toFragment.normalize());
  const cosInner = Math.cos(spot.innerAngle);
  const cosOuter = Math.cos(spot.outerAngle);
  if (cosAngle >= cosInner) return 1;
  if (cosAngle <= cosOuter) return 0;
  const t = (cosAngle - cosOuter) / (cosInner - cosOuter);
  return t * t * (3 - 2 * t); // smoothstep
}

/**
 * Light-space view-projection for a directional light's shadow map, framing a
 * scene bounding sphere (`center`, `radius`). Orthographic, right-handed,
 * z-clip [-1, 1] — the matrix a shadow depth pass renders with.
 */
export function directionalShadowMatrix(direction: Vec3, center: Vec3, radius: number): Mat4 {
  const dir = direction.normalize();
  const eye = center.sub(dir.scale(radius)); // step back along the light so the sphere is in front
  const up = Math.abs(dir.y) > 0.99 ? new Vec3(1, 0, 0) : new Vec3(0, 1, 0);
  const view = Mat4.lookAt(eye, center, up);
  const proj = Mat4.orthographic(-radius, radius, -radius, radius, 0, 2 * radius);
  return proj.multiply(view);
}
