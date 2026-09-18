import { test } from "node:test";
import assert from "node:assert/strict";
import { Transform, Quaternion, Vec3, Mat4 } from "../src/index.ts";

const HALF_PI = Math.PI / 2;
const Z = new Vec3(0, 0, 1);

test("identity transform is a no-op and its matrix is identity", () => {
  const p = new Vec3(3, -2, 5);
  assert.ok(Transform.identity.transformPoint(p).equals(p));
  assert.ok(Transform.identity.toMatrix().equals(Mat4.identity()));
});

test("translation only moves points, not directions", () => {
  const t = Transform.identity.withPosition(new Vec3(10, 20, 30));
  assert.ok(t.transformPoint(new Vec3(1, 2, 3)).equals(new Vec3(11, 22, 33)));
  assert.ok(t.transformDirection(new Vec3(1, 2, 3)).equals(new Vec3(1, 2, 3)));
});

test("rotation only: 90° about Z maps X → Y", () => {
  const t = Transform.identity.withRotation(Quaternion.fromAxisAngle(Z, HALF_PI));
  assert.ok(t.transformPoint(new Vec3(1, 0, 0)).equals(new Vec3(0, 1, 0)));
});

test("scale only scales points and directions", () => {
  const t = Transform.identity.withScale(new Vec3(2, 3, 4));
  assert.ok(t.transformPoint(new Vec3(1, 1, 1)).equals(new Vec3(2, 3, 4)));
  assert.ok(t.transformDirection(new Vec3(1, 1, 1)).equals(new Vec3(2, 3, 4)));
});

test("TRS order: scale, then rotate, then translate", () => {
  const t = new Transform(
    new Vec3(5, 0, 0),
    Quaternion.fromAxisAngle(Z, HALF_PI),
    new Vec3(2, 2, 2),
  );
  // (1,0,0) → scale ×2 → (2,0,0) → rotate 90°Z → (0,2,0) → +translate → (5,2,0)
  assert.ok(t.transformPoint(new Vec3(1, 0, 0)).equals(new Vec3(5, 2, 0)));
});

test("toMatrix agrees with transformPoint", () => {
  const t = new Transform(
    new Vec3(-3, 7, 1),
    Quaternion.fromAxisAngle(new Vec3(1, 1, 0).normalize(), 0.8),
    new Vec3(1.5, 0.5, 2),
  );
  const m = t.toMatrix();
  for (const p of [new Vec3(1, 0, 0), new Vec3(0, 1, 0), new Vec3(2, -3, 4)]) {
    assert.ok(m.transformPoint(p).equals(t.transformPoint(p)));
  }
});
