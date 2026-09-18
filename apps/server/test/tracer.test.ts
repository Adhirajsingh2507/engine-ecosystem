import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3, Ray, Sphere } from "@engine/math";
import { intersect, radiance, acesTonemap, mulberry32, Camera } from "../src/tracer.ts";
import type { Scene } from "../src/tracer.ts";
import { encodePng } from "../src/png.ts";

const scene: Scene = {
  planeY: 0,
  planeA: new Vec3(0.8, 0.8, 0.8),
  planeB: new Vec3(0.3, 0.3, 0.3),
  objects: [{ sphere: new Sphere(new Vec3(0, 1, 0), 1), material: { albedo: new Vec3(0.7, 0.2, 0.2) } }],
};

test("intersect: ray hits the sphere with an outward unit normal", () => {
  const ray = new Ray(new Vec3(0, 1, 5), new Vec3(0, 0, -1));
  const hit = intersect(scene, ray);
  assert.ok(hit);
  assert.ok(Math.abs(hit!.t - 4) < 1e-6); // enters sphere at z = 1
  assert.ok(hit!.point.equals(new Vec3(0, 1, 1)));
  assert.ok(hit!.normal.equals(new Vec3(0, 0, 1)));
  assert.ok(Math.abs(hit!.normal.length() - 1) < 1e-9);
});

test("intersect: ray hits the ground plane at y=0", () => {
  const ray = new Ray(new Vec3(3, 5, 3), new Vec3(0, -1, 0));
  const hit = intersect(scene, ray);
  assert.ok(hit);
  assert.ok(Math.abs(hit!.point.y) < 1e-9);
  assert.ok(hit!.normal.equals(new Vec3(0, 1, 0)));
});

test("intersect: ray into empty sky misses", () => {
  const ray = new Ray(new Vec3(0, 5, 0), new Vec3(0, 1, 0));
  assert.equal(intersect(scene, ray), null);
});

test("radiance of a ray to the sky is positive and finite", () => {
  const rng = mulberry32(1);
  const c = radiance(scene, new Ray(new Vec3(0, 2, 0), new Vec3(0, 1, 0)), 4, rng);
  assert.ok(c.x > 0 && c.y > 0 && c.z > 0);
  assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z));
});

test("radiance is deterministic for a fixed seed", () => {
  const ray = new Ray(new Vec3(0, 1, 5), new Vec3(0, 0, -1));
  const a = radiance(scene, ray, 5, mulberry32(42));
  const b = radiance(scene, ray, 5, mulberry32(42));
  assert.ok(a.equals(b));
});

test("ACES tone map: 0→0, monotone, and bounded in [0,1)", () => {
  assert.equal(acesTonemap(0), 0);
  assert.ok(acesTonemap(0.5) < acesTonemap(1));
  assert.ok(acesTonemap(1000) <= 1 && acesTonemap(1000) > 0.9);
});

test("camera ray passes through the frame and is normalized", () => {
  const cam = new Camera(new Vec3(0, 0, 5), new Vec3(0, 0, 0), new Vec3(0, 1, 0), 60, 1);
  const center = cam.ray(0.5, 0.5, mulberry32(0));
  assert.ok(Math.abs(center.direction.length() - 1) < 1e-9);
  assert.ok(center.direction.equals(new Vec3(0, 0, -1))); // straight ahead
});

test("PNG encoder emits a valid signature + IHDR dimensions", () => {
  const png = encodePng(2, 3, new Uint8Array(2 * 3 * 3));
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // IHDR data starts at byte 16 (8 sig + 4 len + 4 "IHDR")
  assert.equal(png.readUInt32BE(16), 2); // width
  assert.equal(png.readUInt32BE(20), 3); // height
});
