// ── 3D ────────────────────────────────────────────────────────────
export { Vec3 } from "./vec3.ts";
export { Vec4 } from "./vec4.ts";
export { Quaternion } from "./quaternion.ts";
export { Mat3 } from "./mat3.ts";
export { Mat4 } from "./mat4.ts";
export { Transform } from "./transform.ts";
export { Ray, Aabb, Sphere } from "./geometry.ts";
export {
  raySphere,
  rayAabb,
  sphereSphere,
  aabbAabb,
  sphereAabb,
} from "./intersect.ts";
export { Triangle } from "./triangle.ts";
export { rayTriangle } from "./triangle.ts";
export type { TriHit } from "./triangle.ts";

// ── 2D ────────────────────────────────────────────────────────────
export { Vec2 } from "./vec2.ts";
export { Transform2D } from "./transform2d.ts";
export { Ray2, Aabb2, Circle } from "./geometry2d.ts";
export {
  rayCircle,
  rayAabb2,
  circleCircle,
  aabb2Aabb2,
  circleAabb2,
} from "./intersect2d.ts";
