import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec2 } from "@engine/math";
import {
  Ray2, Aabb2, Circle,
  rayCircle, rayAabb2, circleCircle, aabb2Aabb2, circleAabb2,
} from "../src/index.ts";

test("ray hits circle at the near surface", () => {
  const r = new Ray2(new Vec2(-5, 0), new Vec2(1, 0));
  const t = rayCircle(r, new Circle(Vec2.zero, 2));
  assert.ok(t !== null && Math.abs(t! - 3) < 1e-9); // enters at x = -2
});

test("ray misses circle", () => {
  const r = new Ray2(new Vec2(-5, 5), new Vec2(1, 0));
  assert.equal(rayCircle(r, new Circle(Vec2.zero, 2)), null);
});

test("ray from inside AABB2 returns 0", () => {
  const r = new Ray2(Vec2.zero, new Vec2(1, 0));
  assert.equal(rayAabb2(r, Aabb2.fromCenter(Vec2.zero, new Vec2(1, 1))), 0);
});

test("overlap predicates", () => {
  assert.ok(circleCircle(new Circle(Vec2.zero, 1), new Circle(new Vec2(1.5, 0), 1)));
  assert.ok(!circleCircle(new Circle(Vec2.zero, 1), new Circle(new Vec2(3, 0), 1)));
  assert.ok(aabb2Aabb2(Aabb2.fromCenter(Vec2.zero, Vec2.one), Aabb2.fromCenter(new Vec2(1.5, 0), Vec2.one)));
  assert.ok(circleAabb2(new Circle(new Vec2(2, 0), 1.1), Aabb2.fromCenter(Vec2.zero, Vec2.one)));
});
