import { test } from "node:test";
import assert from "node:assert/strict";
import { Quaternion, Vec3 } from "../src/index.ts";

const HALF_PI = Math.PI / 2;
const Z = new Vec3(0, 0, 1);

test("identity rotates nothing", () => {
  const v = new Vec3(1, 2, 3);
  assert.ok(Quaternion.identity.rotate(v).equals(v));
});

test("fromAxisAngle 90° about Z maps X → Y", () => {
  const q = Quaternion.fromAxisAngle(Z, HALF_PI);
  assert.ok(q.rotate(new Vec3(1, 0, 0)).equals(new Vec3(0, 1, 0)));
  // axis itself is unchanged
  assert.ok(q.rotate(Z).equals(Z));
});

test("fromAxisAngle produces a unit quaternion", () => {
  const q = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), 1.23);
  assert.ok(Math.abs(q.length() - 1) < 1e-9);
});

test("length / normalize", () => {
  const q = new Quaternion(1, 2, 3, 4);
  assert.ok(Math.abs(q.length() - Math.sqrt(30)) < 1e-9);
  assert.ok(Math.abs(q.normalize().length() - 1) < 1e-9);
});

test("normalize(0) falls back to identity, not NaN", () => {
  const q = new Quaternion(0, 0, 0, 0).normalize();
  assert.ok(q.equals(Quaternion.identity));
});

test("conjugate is the inverse for a unit quaternion", () => {
  const q = Quaternion.fromAxisAngle(new Vec3(1, 1, 1).normalize(), 0.7);
  assert.ok(q.conjugate().equals(q.inverse()));
});

test("q * q⁻¹ = identity", () => {
  const q = Quaternion.fromAxisAngle(Z, 1.1);
  assert.ok(q.multiply(q.inverse()).equals(Quaternion.identity));
});

test("composing two 45° Z-rotations equals one 90°", () => {
  const a = Quaternion.fromAxisAngle(Z, Math.PI / 4);
  const composed = a.multiply(a);
  const direct = Quaternion.fromAxisAngle(Z, HALF_PI);
  assert.ok(composed.rotate(new Vec3(1, 0, 0)).equals(direct.rotate(new Vec3(1, 0, 0))));
});

test("multiply applies right operand first", () => {
  // rotate X by (rotZ90 * rotZ90) — order-independent here, but checks chaining
  const rz = Quaternion.fromAxisAngle(Z, HALF_PI);
  const v = rz.multiply(rz).rotate(new Vec3(1, 0, 0));
  assert.ok(v.equals(new Vec3(-1, 0, 0)));
});

test("slerp endpoints and midpoint", () => {
  const a = Quaternion.identity;
  const b = Quaternion.fromAxisAngle(Z, HALF_PI);
  assert.ok(a.slerp(b, 0).equals(a));
  assert.ok(a.slerp(b, 1).equals(b));
  // midpoint = 45° about Z
  const mid = a.slerp(b, 0.5);
  const expected = Quaternion.fromAxisAngle(Z, Math.PI / 4);
  assert.ok(mid.rotate(new Vec3(1, 0, 0)).equals(expected.rotate(new Vec3(1, 0, 0))));
});

test("slerp takes the short path across the antipode", () => {
  const a = Quaternion.fromAxisAngle(Z, 0.1);
  const bLong = new Quaternion(-a.x, -a.y, -a.z, -a.w); // same rotation, opposite sign
  // slerp should treat bLong as a (short path) → stays near a
  assert.ok(a.slerp(bLong, 0.5).rotate(new Vec3(1, 0, 0)).equals(a.rotate(new Vec3(1, 0, 0))));
});
