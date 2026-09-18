import { test } from "node:test";
import assert from "node:assert/strict";
import { Mat3, Vec2, Vec3, Quaternion, Mat4 } from "../src/index.ts";

test("identity is a no-op on a vector", () => {
  const v = new Vec3(2, -3, 4);
  assert.ok(Mat3.identity().multiplyVec3(v).equals(v));
});

test("inverse · matrix = identity", () => {
  const m = new Mat3([2, 0, 1, 0, 3, 0, 1, 0, 2]); // arbitrary invertible
  const inv = m.inverse();
  assert.ok(inv);
  assert.ok(inv!.multiply(m).equals(Mat3.identity()));
});

test("singular matrix has no inverse", () => {
  const m = new Mat3([1, 2, 3, 2, 4, 6, 7, 8, 9]); // col1 = 2·col0
  assert.equal(m.inverse(), null);
});

test("determinant of a diagonal is the product", () => {
  assert.equal(Mat3.diagonal(2, 3, 4).determinant(), 24);
});

test("fromQuaternion agrees with quaternion.rotate", () => {
  const q = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), Math.PI / 3);
  const v = new Vec3(1, 2, 3);
  assert.ok(Mat3.fromQuaternion(q).multiplyVec3(v).equals(q.rotate(v)));
});

test("fromMat4 extracts the linear (rotation) part", () => {
  const q = Quaternion.fromAxisAngle(new Vec3(1, 0, 0), 0.7);
  const m4 = Mat4.translation(new Vec3(5, 6, 7)).multiply(Mat4.fromQuaternion(q));
  const v = new Vec3(1, -1, 2);
  assert.ok(Mat3.fromMat4(m4).multiplyVec3(v).equals(q.rotate(v)));
});

test("2D affine: rotate 90° about origin then translate", () => {
  const m = Mat3.translation2d(new Vec2(10, 0)).multiply(Mat3.rotation2d(Math.PI / 2));
  assert.ok(m.transformPoint2d(new Vec2(1, 0)).equals(new Vec2(10, 1)));
});

test("2D direction ignores translation", () => {
  const m = Mat3.translation2d(new Vec2(10, 20)).multiply(Mat3.scaling2d(new Vec2(2, 3)));
  assert.ok(m.transformDirection2d(new Vec2(1, 1)).equals(new Vec2(2, 3)));
});
