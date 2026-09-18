import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "../src/vec3.ts";

test("constructor defaults to zero", () => {
  assert.ok(new Vec3().equals(Vec3.zero));
  assert.ok(new Vec3(1, 2, 3).equals(new Vec3(1, 2, 3)));
});

test("static constants", () => {
  assert.deepEqual(Vec3.zero.toArray(), [0, 0, 0]);
  assert.deepEqual(Vec3.one.toArray(), [1, 1, 1]);
});

test("add / sub / scale", () => {
  const a = new Vec3(1, 2, 3);
  const b = new Vec3(4, 5, 6);
  assert.ok(a.add(b).equals(new Vec3(5, 7, 9)));
  assert.ok(b.sub(a).equals(new Vec3(3, 3, 3)));
  assert.ok(a.scale(2).equals(new Vec3(2, 4, 6)));
  assert.ok(a.scale(0).equals(Vec3.zero));
  assert.ok(a.scale(-1).equals(new Vec3(-1, -2, -3)));
});

test("operations do not mutate their operands (immutability)", () => {
  const a = new Vec3(1, 2, 3);
  const b = new Vec3(4, 5, 6);
  a.add(b);
  a.scale(10);
  a.cross(b);
  assert.ok(a.equals(new Vec3(1, 2, 3)));
  assert.ok(b.equals(new Vec3(4, 5, 6)));
});

test("dot product", () => {
  assert.equal(new Vec3(1, 2, 3).dot(new Vec3(4, 5, 6)), 32);
  // orthogonal axes have zero dot
  assert.equal(new Vec3(1, 0, 0).dot(new Vec3(0, 1, 0)), 0);
  // dot with self equals lengthSq
  const v = new Vec3(2, -3, 4);
  assert.equal(v.dot(v), v.lengthSq());
});

test("cross product is right-handed and anti-commutative", () => {
  const x = new Vec3(1, 0, 0);
  const y = new Vec3(0, 1, 0);
  const z = new Vec3(0, 0, 1);
  assert.ok(x.cross(y).equals(z)); // x × y = z
  assert.ok(y.cross(z).equals(x)); // y × z = x
  assert.ok(z.cross(x).equals(y)); // z × x = y
  assert.ok(x.cross(y).equals(y.cross(x).scale(-1))); // a×b = -(b×a)
  assert.ok(x.cross(x).equals(Vec3.zero)); // parallel → zero
});

test("cross is perpendicular to both inputs", () => {
  const a = new Vec3(3, -3, 1);
  const b = new Vec3(4, 9, 2);
  const c = a.cross(b);
  assert.ok(Math.abs(c.dot(a)) < 1e-9);
  assert.ok(Math.abs(c.dot(b)) < 1e-9);
});

test("lengthSq and length", () => {
  const v = new Vec3(3, 4, 0);
  assert.equal(v.lengthSq(), 25);
  assert.equal(v.length(), 5);
  assert.equal(Vec3.zero.length(), 0);
  // 3-4-12 → 13
  assert.equal(new Vec3(3, 4, 12).length(), 13);
});

test("normalize yields a unit vector", () => {
  const v = new Vec3(3, 4, 0);
  assert.ok(v.normalize().equals(new Vec3(0.6, 0.8, 0)));
  const n = new Vec3(1, 2, 3).normalize();
  assert.ok(Math.abs(n.length() - 1) < 1e-9);
});

test("normalize(0) is zero, not NaN", () => {
  const n = Vec3.zero.normalize();
  assert.ok(n.equals(Vec3.zero));
  assert.ok(!Number.isNaN(n.x) && !Number.isNaN(n.y) && !Number.isNaN(n.z));
});

test("distanceTo is symmetric and matches known values", () => {
  const a = new Vec3(0, 0, 0);
  const b = new Vec3(3, 4, 0);
  assert.equal(a.distanceTo(b), 5);
  assert.equal(b.distanceTo(a), 5);
  assert.equal(a.distanceTo(a), 0);
});

test("lerp: endpoints, midpoint, and unclamped extrapolation", () => {
  const a = new Vec3(0, 0, 0);
  const b = new Vec3(10, 20, 30);
  assert.ok(a.lerp(b, 0).equals(a));
  assert.ok(a.lerp(b, 1).equals(b));
  assert.ok(a.lerp(b, 0.5).equals(new Vec3(5, 10, 15)));
  assert.ok(a.lerp(b, 2).equals(new Vec3(20, 40, 60))); // unclamped
  assert.ok(a.lerp(b, -1).equals(new Vec3(-10, -20, -30)));
});

test("equals respects the epsilon tolerance", () => {
  const a = new Vec3(1, 1, 1);
  assert.ok(a.equals(new Vec3(1 + 1e-9, 1, 1))); // within default eps
  assert.ok(!a.equals(new Vec3(1.01, 1, 1))); // outside default eps
  assert.ok(a.equals(new Vec3(1.01, 1, 1), 0.1)); // custom eps
});

test("toArray round-trips through the constructor", () => {
  const v = new Vec3(7, -8, 9);
  const [x, y, z] = v.toArray();
  assert.ok(new Vec3(x, y, z).equals(v));
});

test("euler integration step: x += v*dt", () => {
  // the doc's motivating example — physics builds on exactly this
  const dt = 0.5;
  let pos = new Vec3(0, 0, 0);
  const vel = new Vec3(2, 0, 0);
  pos = pos.add(vel.scale(dt));
  assert.ok(pos.equals(new Vec3(1, 0, 0)));
});
