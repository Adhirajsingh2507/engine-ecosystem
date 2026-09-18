import { Vec3, Sphere } from "@engine/math";
import type { Scene } from "./tracer.ts";

/** The cinematic still: a metal + coloured spheres on a checker floor, lit by a
 *  large warm emissive "sun" (soft shadows) over a dusk sky. */
export const SCENE: Scene = {
  planeY: 0,
  planeA: new Vec3(0.82, 0.82, 0.85),
  planeB: new Vec3(0.32, 0.33, 0.37),
  objects: [
    // area light — big + warm so shadows are soft and noise stays low
    { sphere: new Sphere(new Vec3(-6, 9, 3), 3.5), material: { albedo: new Vec3(0, 0, 0), emission: new Vec3(6, 5.2, 4.4) } },
    // polished metal
    { sphere: new Sphere(new Vec3(-1.7, 1.0, 0.1), 1.0), material: { albedo: new Vec3(0.92, 0.92, 0.95), metal: true, roughness: 0.04 } },
    // diffuse hero spheres
    { sphere: new Sphere(new Vec3(0.7, 1.2, -0.7), 1.2), material: { albedo: new Vec3(0.28, 0.45, 0.95) } },
    { sphere: new Sphere(new Vec3(2.4, 0.8, 0.8), 0.8), material: { albedo: new Vec3(0.95, 0.55, 0.28) } },
    { sphere: new Sphere(new Vec3(-0.3, 0.6, 1.9), 0.6), material: { albedo: new Vec3(0.35, 0.8, 0.62) } },
    { sphere: new Sphere(new Vec3(1.15, 0.5, 2.7), 0.5), material: { albedo: new Vec3(0.85, 0.32, 0.5) } },
    // brushed metal, rougher
    { sphere: new Sphere(new Vec3(3.4, 0.55, 2.0), 0.55), material: { albedo: new Vec3(0.8, 0.78, 0.72), metal: true, roughness: 0.22 } },
  ],
};

export const CAMERA = {
  eye: new Vec3(0, 2.3, 8.5),
  target: new Vec3(0.4, 1.0, 0.4),
  up: new Vec3(0, 1, 0),
  vfov: 40,
  aperture: 0.12,
};
