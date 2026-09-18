import { test } from "node:test";
import assert from "node:assert/strict";
import { Mat4, Quaternion, Vec3 } from "../src/index.ts";

const HALF_PI = Math.PI / 2;

test("constructor rejects wrong element count", () => {
  assert.throws(() => new Mat4([1, 2, 3]), RangeError);
});

test("identity is a multiplicative unit", () => {
  const m = new Mat4([
    2, 3, 0, 0, 4, 5, 0, 0, 0, 0, 1, 0, 6, 7, 0, 1,
  ]);
  assert.ok(m.multiply(Mat4.identity()).equals(m));
  assert.ok(Mat4.identity().multiply(m).equals(m));
});

test("identity leaves points and directions unchanged", () => {
  const p = new Vec3(3, -2, 5);
  assert.ok(Mat4.identity().transformPoint(p).equals(p));
  assert.ok(Mat4.identity().transformDirection(p).equals(p));
});

test("translation moves points but not directions", () => {
  const t = Mat4.translation(new Vec3(10, 20, 30));
  assert.ok(t.transformPoint(new Vec3(1, 2, 3)).equals(new Vec3(11, 22, 33)));
  // a direction (w=0) ignores translation
  assert.ok(t.transformDirection(new Vec3(1, 2, 3)).equals(new Vec3(1, 2, 3)));
});

test("scaling scales points", () => {
  const s = Mat4.scaling(new Vec3(2, 3, 4));
  assert.ok(s.transformPoint(new Vec3(1, 1, 1)).equals(new Vec3(2, 3, 4)));
});

test("transpose swaps rows and columns; double transpose is identity op", () => {
  const m = new Mat4([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);
  const t = m.transpose();
  assert.equal(t.e[1], m.e[4]); // (row1,col0) ↔ (row0,col1)
  assert.ok(t.transpose().equals(m));
});

test("determinant of identity is 1; scaling multiplies volume", () => {
  assert.equal(Mat4.identity().determinant(), 1);
  assert.ok(Math.abs(Mat4.scaling(new Vec3(2, 3, 4)).determinant() - 24) < 1e-9);
});

test("inverse: M * M⁻¹ = identity", () => {
  const m = Mat4.translation(new Vec3(5, -3, 2)).multiply(
    Mat4.fromQuaternion(Quaternion.fromAxisAngle(new Vec3(0, 1, 0), 0.9)),
  );
  const inv = m.inverse();
  assert.ok(inv !== null);
  assert.ok(m.multiply(inv!).equals(Mat4.identity()));
});

test("inverse returns null for a singular matrix", () => {
  const singular = Mat4.scaling(new Vec3(0, 1, 1)); // det = 0
  assert.equal(singular.inverse(), null);
});

test("fromQuaternion(identity) is the identity matrix", () => {
  assert.ok(Mat4.fromQuaternion(Quaternion.identity).equals(Mat4.identity()));
});

test("rotation matrix matches quaternion.rotate", () => {
  const q = Quaternion.fromAxisAngle(new Vec3(0, 0, 1), HALF_PI);
  const m = Mat4.fromQuaternion(q);
  const v = new Vec3(1, 0, 0);
  assert.ok(m.transformDirection(v).equals(q.rotate(v)));
  assert.ok(m.transformDirection(v).equals(new Vec3(0, 1, 0)));
});

test("lookAt places the eye at the origin of view space", () => {
  const view = Mat4.lookAt(new Vec3(0, 0, 5), Vec3.zero, new Vec3(0, 1, 0));
  // the eye maps to the view-space origin
  assert.ok(view.transformPoint(new Vec3(0, 0, 5)).equals(Vec3.zero));
  // the target sits down the -Z axis at distance 5
  assert.ok(view.transformPoint(Vec3.zero).equals(new Vec3(0, 0, -5)));
});

test("perspective keeps a point on the near plane inside the clip cube", () => {
  const p = Mat4.perspective(HALF_PI, 1, 1, 100);
  const clip = p.transformPoint(new Vec3(0, 0, -1)); // on near plane
  // after perspective divide, near-plane center maps to z = -1
  assert.ok(Math.abs(clip.z - -1) < 1e-6);
});

test("orthographic maps its box corners to the NDC cube", () => {
  const o = Mat4.orthographic(-2, 2, -2, 2, 1, 10);
  assert.ok(o.transformPoint(new Vec3(2, 2, -1)).equals(new Vec3(1, 1, -1)));
  assert.ok(o.transformPoint(new Vec3(-2, -2, -10)).equals(new Vec3(-1, -1, 1)));
});
