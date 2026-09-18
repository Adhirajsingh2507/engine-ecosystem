import { test } from "node:test";
import assert from "node:assert/strict";
import { Sphere, Aabb, Vec3 } from "@engine/math";
import { sphereSphereContact, sphereAabbContact } from "../src/index.ts";

test("sphere-sphere: overlap gives depth + a→b normal", () => {
  const c = sphereSphereContact(
    new Sphere(new Vec3(0, 0, 0), 1),
    new Sphere(new Vec3(1.5, 0, 0), 1),
  );
  assert.ok(c);
  assert.ok(c!.normal.equals(new Vec3(1, 0, 0)));
  assert.ok(Math.abs(c!.depth - 0.5) < 1e-9); // (1+1) - 1.5
  assert.ok(c!.point.equals(new Vec3(0.75, 0, 0))); // middle of the overlap
});

test("sphere-sphere: no overlap → null", () => {
  assert.equal(
    sphereSphereContact(new Sphere(Vec3.zero, 1), new Sphere(new Vec3(3, 0, 0), 1)),
    null,
  );
});

test("sphere-sphere: exact touch is a depth-0 contact", () => {
  const c = sphereSphereContact(new Sphere(Vec3.zero, 1), new Sphere(new Vec3(2, 0, 0), 1));
  assert.ok(c);
  assert.ok(Math.abs(c!.depth) < 1e-9);
});

test("sphere-sphere: concentric spheres don't NaN", () => {
  const c = sphereSphereContact(new Sphere(Vec3.zero, 1), new Sphere(Vec3.zero, 2));
  assert.ok(c);
  assert.ok(Math.abs(c!.depth - 3) < 1e-9);
  assert.ok(!Number.isNaN(c!.normal.x));
  assert.ok(Math.abs(c!.normal.length() - 1) < 1e-9);
});

test("sphere-AABB: center outside → normal toward the box face", () => {
  const c = sphereAabbContact(
    new Sphere(new Vec3(1.5, 0, 0), 1),
    new Aabb(new Vec3(-1, -1, -1), new Vec3(1, 1, 1)),
  );
  assert.ok(c);
  assert.ok(c!.normal.equals(new Vec3(-1, 0, 0))); // sphere → box (box is toward -x)
  assert.ok(Math.abs(c!.depth - 0.5) < 1e-9);
  assert.ok(c!.point.equals(new Vec3(1, 0, 0)));
});

test("sphere-AABB: no contact → null", () => {
  assert.equal(
    sphereAabbContact(
      new Sphere(new Vec3(3, 0, 0), 1),
      new Aabb(new Vec3(-1, -1, -1), new Vec3(1, 1, 1)),
    ),
    null,
  );
});

test("sphere-AABB: center inside exits via the nearest face", () => {
  const c = sphereAabbContact(
    new Sphere(new Vec3(1.5, 0, 0), 0.5),
    new Aabb(new Vec3(-2, -2, -2), new Vec3(2, 2, 2)),
  );
  assert.ok(c);
  assert.ok(c!.normal.equals(new Vec3(-1, 0, 0))); // nearest face is +x → push out +x
  assert.ok(Math.abs(c!.depth - 1) < 1e-9); // radius 0.5 + 0.5 to the face
  assert.ok(c!.point.equals(new Vec3(2, 0, 0)));
});
