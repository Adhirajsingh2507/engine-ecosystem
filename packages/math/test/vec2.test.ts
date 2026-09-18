import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec2, Transform2D } from "../src/index.ts";

test("dot, cross, perp", () => {
  const a = new Vec2(1, 0);
  const b = new Vec2(0, 1);
  assert.equal(a.dot(b), 0);
  assert.equal(a.cross(b), 1); // signed area of the unit square
  assert.ok(a.perp().equals(b)); // (1,0) → (0,1)
});

test("normalize of zero is zero, not NaN", () => {
  assert.ok(Vec2.zero.normalize().equals(Vec2.zero));
});

test("length and lerp", () => {
  assert.equal(new Vec2(3, 4).length(), 5);
  assert.ok(new Vec2(0, 0).lerp(new Vec2(10, 20), 0.5).equals(new Vec2(5, 10)));
});

test("Transform2D applies scale → rotate → translate", () => {
  const t = new Transform2D(new Vec2(5, 0), Math.PI / 2, new Vec2(2, 2));
  // (1,0) → scale (2,0) → rotate 90° (0,2) → translate (5,2)
  assert.ok(t.transformPoint(new Vec2(1, 0)).equals(new Vec2(5, 2)));
});

test("Transform2D matrix matches direct transform", () => {
  const t = new Transform2D(new Vec2(-3, 7), 0.9, new Vec2(1.5, 0.5));
  const p = new Vec2(2, -4);
  assert.ok(t.toMatrix().transformPoint2d(p).equals(t.transformPoint(p)));
});
