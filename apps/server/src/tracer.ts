import { Vec3, Ray, Sphere, raySphere } from "@engine/math";
import type { TriMeshObj } from "./mesh.ts";

/**
 * A compact Monte-Carlo path tracer. It reuses @engine/math for all geometry
 * (Ray, Sphere, raySphere) — the same core the real-time WebGL client renders
 * with — and adds offline-only quality: global illumination via diffuse bounces,
 * soft shadows from an area (emissive) light, a physical-camera depth of field,
 * and ACES filmic tone mapping.
 *
 * ponytail: single-threaded and cosine-sampled (no next-event estimation). It's
 * an offline renderer, so wall-clock isn't the constraint — quality is. Add
 * worker_threads over row-bands, and NEE toward the light, when render time bites.
 */

export interface Material {
  albedo: Vec3;
  emission?: Vec3;
  metal?: boolean;
  roughness?: number;
}

export interface Obj {
  sphere: Sphere;
  material: Material;
}

export interface Scene {
  objects: Obj[];
  meshes?: TriMeshObj[];
  planeY: number;
  planeA: Vec3; // checker colour A
  planeB: Vec3; // checker colour B
  skyHorizon?: Vec3;
  skyZenith?: Vec3;
  skyIntensity?: number;
  sunDirection?: Vec3;
  sunColor?: Vec3;
}

export interface Hit {
  t: number;
  point: Vec3;
  normal: Vec3;
  material: Material;
}

const EPS = 1e-4;
const MAX_RADIANCE = 12; // firefly clamp
const BLACK = new Vec3(0, 0, 0);

const mul = (a: Vec3, b: Vec3): Vec3 => new Vec3(a.x * b.x, a.y * b.y, a.z * b.z);
const reflect = (d: Vec3, n: Vec3): Vec3 => d.sub(n.scale(2 * d.dot(n)));

export type Rng = () => number;

/** Deterministic PRNG so a render is reproducible (and testable). */
export function mulberry32(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cosine-weighted hemisphere sample about a unit normal. */
function cosineHemisphere(n: Vec3, rng: Rng): Vec3 {
  const phi = 2 * Math.PI * rng();
  const r2 = rng();
  const r2s = Math.sqrt(r2);
  const a = Math.abs(n.x) > 0.9 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
  const u = a.cross(n).normalize();
  const v = n.cross(u);
  return u
    .scale(Math.cos(phi) * r2s)
    .add(v.scale(Math.sin(phi) * r2s))
    .add(n.scale(Math.sqrt(1 - r2)))
    .normalize();
}

function randomUnit(rng: Rng): Vec3 {
  const z = 1 - 2 * rng();
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  const phi = 2 * Math.PI * rng();
  return new Vec3(r * Math.cos(phi), r * Math.sin(phi), z);
}

export function intersect(scene: Scene, ray: Ray): Hit | null {
  let bestT = Infinity;
  let hit: Hit | null = null;

  for (const o of scene.objects) {
    const t = raySphere(ray, o.sphere);
    if (t !== null && t > EPS && t < bestT) {
      bestT = t;
      const point = ray.at(t);
      hit = {
        t,
        point,
        normal: point.sub(o.sphere.center).scale(1 / o.sphere.radius),
        material: o.material,
      };
    }
  }

  // triangle meshes via BVH
  if (scene.meshes) {
    for (const mo of scene.meshes) {
      const mh = mo.mesh.intersect(ray, bestT);
      if (mh && mh.t > EPS && mh.t < bestT) {
        bestT = mh.t;
        hit = {
          t: mh.t,
          point: mh.point,
          normal: mh.normal,
          material: mo.materials[mh.matIndex] ?? mo.materials[0],
        };
      }
    }
  }

  // infinite ground plane at y = planeY, with a checker albedo
  if (Math.abs(ray.direction.y) > 1e-9) {
    const t = (scene.planeY - ray.origin.y) / ray.direction.y;
    if (t > EPS && t < bestT) {
      const point = ray.at(t);
      const checker = ((Math.floor(point.x) + Math.floor(point.z)) & 1) === 0;
      hit = {
        t,
        point,
        normal: new Vec3(0, 1, 0),
        material: { albedo: checker ? scene.planeA : scene.planeB },
      };
    }
  }

  return hit;
}

/** Sky gradient — doubles as the background and as image-based fill light. */
function sky(scene: Scene, dir: Vec3): Vec3 {
  const t = 0.5 * (dir.y + 1);
  const horizon = scene.skyHorizon ?? new Vec3(0.85, 0.78, 0.68);
  const zenith = scene.skyZenith ?? new Vec3(0.22, 0.36, 0.7);
  return horizon.lerp(zenith, t).scale(scene.skyIntensity ?? 1.15);
}

/** Radiance along a ray, accumulated iteratively with a throughput term. */
export function radiance(scene: Scene, ray: Ray, maxDepth: number, rng: Rng): Vec3 {
  let throughput = new Vec3(1, 1, 1);
  let acc = BLACK;
  let r = ray;

  for (let bounce = 0; bounce < maxDepth; bounce++) {
    const hit = intersect(scene, r);
    if (!hit) {
      acc = acc.add(mul(throughput, sky(scene, r.direction)));
      break;
    }
    const m = hit.material;
    if (m.emission) acc = acc.add(mul(throughput, m.emission));

    const origin = hit.point.add(hit.normal.scale(EPS));
    if (scene.sunDirection && scene.sunColor && !m.emission) {
      const lightDir = scene.sunDirection.normalize();
      const nDotL = Math.max(0, hit.normal.dot(lightDir));
      if (nDotL > 0 && intersect(scene, new Ray(origin, lightDir)) === null) {
        const direct = mul(m.albedo, scene.sunColor).scale(nDotL);
        acc = acc.add(mul(throughput, direct));
      }
    }

    let dir: Vec3;
    if (m.metal) {
      const refl = reflect(r.direction, hit.normal);
      dir = m.roughness && m.roughness > 0
        ? refl.add(randomUnit(rng).scale(m.roughness)).normalize()
        : refl;
      if (dir.dot(hit.normal) <= 0) break; // scattered into the surface
    } else {
      dir = cosineHemisphere(hit.normal, rng);
    }
    throughput = mul(throughput, m.albedo);
    r = new Ray(origin, dir);
  }

  return new Vec3(
    Math.min(acc.x, MAX_RADIANCE),
    Math.min(acc.y, MAX_RADIANCE),
    Math.min(acc.z, MAX_RADIANCE),
  );
}

/** Narkowicz ACES filmic curve (applied per channel, in linear space). */
export function acesTonemap(x: number): number {
  const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  const y = (x * (a * x + b)) / (x * (c * x + d) + e);
  return y < 0 ? 0 : y > 1 ? 1 : y;
}

/** Thin-lens pinhole camera with depth of field. */
export class Camera {
  private origin: Vec3;
  private lowerLeft: Vec3;
  private horizontal: Vec3;
  private vertical: Vec3;
  private u: Vec3;
  private v: Vec3;
  private lensRadius: number;

  constructor(
    eye: Vec3,
    target: Vec3,
    up: Vec3,
    vfovDeg: number,
    aspect: number,
    aperture = 0,
    focusDist?: number,
  ) {
    const theta = (vfovDeg * Math.PI) / 180;
    const halfH = Math.tan(theta / 2);
    const viewH = 2 * halfH;
    const viewW = aspect * viewH;
    const w = eye.sub(target).normalize();
    this.u = up.cross(w).normalize();
    this.v = w.cross(this.u);
    const fd = focusDist ?? eye.distanceTo(target);
    this.origin = eye;
    this.horizontal = this.u.scale(viewW * fd);
    this.vertical = this.v.scale(viewH * fd);
    this.lowerLeft = eye
      .sub(this.horizontal.scale(0.5))
      .sub(this.vertical.scale(0.5))
      .sub(w.scale(fd));
    this.lensRadius = aperture / 2;
  }

  /** Ray through screen coords s,t ∈ [0,1] (origin bottom-left). */
  ray(s: number, t: number, rng: Rng): Ray {
    let origin = this.origin;
    if (this.lensRadius > 0) {
      const ang = 2 * Math.PI * rng();
      const rad = this.lensRadius * Math.sqrt(rng());
      origin = origin
        .add(this.u.scale(Math.cos(ang) * rad))
        .add(this.v.scale(Math.sin(ang) * rad));
    }
    const target = this.lowerLeft
      .add(this.horizontal.scale(s))
      .add(this.vertical.scale(t));
    return new Ray(origin, target.sub(origin));
  }
}
