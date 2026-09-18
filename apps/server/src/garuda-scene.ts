import { Vec3 } from "@engine/math";
import type { Scene } from "./tracer.ts";
import { buildGaruda } from "./garuda.ts";

/**
 * Garuda scene — divine eagle-man deity rendered with path tracing.
 *
 * Setup:
 * - Vishnu riding a white, gold-adorned Garuda in flight
 * - Broad layered wings and an emissive halo carried by the mesh
 * - A warm-to-blue environment light that stays clean at CPU render budgets
 * - A cloudlike pale floor far below the flying figure
 * - Slightly low camera angle for a devotional hero composition
 */

const garuda = buildGaruda();

export const GARUDA_SCENE: Scene = {
  planeY: -30,
  planeA: new Vec3(0.08, 0.10, 0.16),
  planeB: new Vec3(0.05, 0.07, 0.13),
  skyHorizon: new Vec3(0.34, 0.28, 0.24),
  skyZenith: new Vec3(0.035, 0.075, 0.19),
  skyIntensity: 1.35,
  sunDirection: new Vec3(-0.42, 0.78, -0.52),
  sunColor: new Vec3(1.55, 1.28, 0.90),
  objects: [],
  meshes: [garuda],
};

export const GARUDA_CAMERA = {
  eye: new Vec3(0, 4.15, -15.5),
  target: new Vec3(0, 4.65, 0.10),
  up: new Vec3(0, 1, 0),
  vfov: 34,
  aperture: 0.025,
};
