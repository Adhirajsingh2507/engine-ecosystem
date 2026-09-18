// ── 3D ────────────────────────────────────────────────────────────
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
export { Ray2, Aabb2, Circle } from "./geometry2d.ts";
export {
  rayCircle,
  rayAabb2,
  circleCircle,
  aabb2Aabb2,
  circleAabb2,
} from "./intersect2d.ts";

// ── acceleration + meshes ─────────────────────────────────────────
export { BVH } from "./bvh.ts";
export type { BVHTriangle, BVHHit } from "./bvh.ts";
export { TriMesh, sphereMesh, cylinderMesh, coneMesh, torusMesh, combineMeshes } from "./mesh.ts";
export type { MeshVertex, MeshData } from "./mesh.ts";
