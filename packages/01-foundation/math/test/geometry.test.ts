import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Aabb, Ray, Sphere, Vec3,
  raySphere, rayAabb, sphereSphere, aabbAabb, sphereAabb,
} from "../src/index.ts";

test("Ray normalizes its direction and at() walks along it", () => {
  const r = new Ray(new Vec3(0, 0, 0), new Vec3(0, 0, -5));
  assert.ok(Math.abs(r.direction.length() - 1) < 1e-9);
  assert.ok(r.at(3).equals(new Vec3(0, 0, -3)));
});

test("Aabb containsPoint / closestPoint / center", () => {
  const box = new Aabb(new Vec3(-1, -1, -1), new Vec3(1, 1, 1));
  assert.ok(box.center().equals(Vec3.zero));
  assert.ok(box.containsPoint(new Vec3(0.5, 0, -0.5)));
  assert.ok(!box.containsPoint(new Vec3(2, 0, 0)));
  // outside point clamps onto the face
  assert.ok(box.closestPoint(new Vec3(5, 0, 0)).equals(new Vec3(1, 0, 0)));
  // inside point is returned unchanged
  assert.ok(box.closestPoint(new Vec3(0.2, 0.2, 0.2)).equals(new Vec3(0.2, 0.2, 0.2)));
});

test("Aabb.fromCenter", () => {
  const box = Aabb.fromCenter(new Vec3(10, 0, 0), new Vec3(2, 3, 4));
  assert.ok(box.min.equals(new Vec3(8, -3, -4)));
  assert.ok(box.max.equals(new Vec3(12, 3, 4)));
});

test("ray-sphere: hit in front, miss, and origin inside", () => {
  const s = new Sphere(new Vec3(0, 0, -10), 1);
  const forward = new Ray(new Vec3(0, 0, 0), new Vec3(0, 0, -1));
  assert.equal(raySphere(forward, s), 9); // enters at z = -9
  // pointing away → miss
  assert.equal(raySphere(new Ray(Vec3.zero, new Vec3(0, 0, 1)), s), null);
  // origin inside → returns the far (positive) root
  const inside = new Ray(new Vec3(0, 0, -10), new Vec3(0, 0, -1));
  assert.equal(raySphere(inside, s), 1);
});

test("ray-AABB: hit, parallel miss, and origin inside → 0", () => {
  const box = new Aabb(new Vec3(-1, -1, -1), new Vec3(1, 1, 1));
  assert.equal(rayAabb(new Ray(new Vec3(0, 0, 5), new Vec3(0, 0, -1)), box), 4);
  // parallel to the box and offset outside → miss
  assert.equal(rayAabb(new Ray(new Vec3(5, 0, 0), new Vec3(0, 0, -1)), box), null);
  // origin inside → 0
  assert.equal(rayAabb(new Ray(Vec3.zero, new Vec3(1, 0, 0)), box), 0);
  // pointing away from the box → miss
  assert.equal(rayAabb(new Ray(new Vec3(0, 0, 5), new Vec3(0, 0, 1)), box), null);
});

test("sphere-sphere overlap incl. exact touch", () => {
  const a = new Sphere(new Vec3(0, 0, 0), 1);
  assert.ok(sphereSphere(a, new Sphere(new Vec3(1.5, 0, 0), 1))); // overlap
  assert.ok(sphereSphere(a, new Sphere(new Vec3(2, 0, 0), 1))); // touch
  assert.ok(!sphereSphere(a, new Sphere(new Vec3(2.1, 0, 0), 1))); // apart
});

test("aabb-aabb overlap incl. edge touch", () => {
  const a = new Aabb(new Vec3(0, 0, 0), new Vec3(2, 2, 2));
  assert.ok(aabbAabb(a, new Aabb(new Vec3(1, 1, 1), new Vec3(3, 3, 3))));
  assert.ok(aabbAabb(a, new Aabb(new Vec3(2, 0, 0), new Vec3(4, 2, 2)))); // touch
  assert.ok(!aabbAabb(a, new Aabb(new Vec3(3, 0, 0), new Vec3(4, 2, 2))));
});

test("sphere-AABB overlap via closest point", () => {
  const box = new Aabb(new Vec3(-1, -1, -1), new Vec3(1, 1, 1));
  assert.ok(sphereAabb(new Sphere(new Vec3(1.5, 0, 0), 1), box)); // reaches face
  assert.ok(!sphereAabb(new Sphere(new Vec3(3, 0, 0), 1), box)); // too far
  // near a corner: distance = √3 ≈ 1.732, radius 1.8 → hit
  assert.ok(sphereAabb(new Sphere(new Vec3(2, 2, 2), 1.8), box));
  assert.ok(!sphereAabb(new Sphere(new Vec3(2, 2, 2), 1.7), box));
});
