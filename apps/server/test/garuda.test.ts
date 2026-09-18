import { test } from "node:test";
import assert from "node:assert/strict";
import { Ray, Vec3 } from "@engine/math";
import { buildGaruda } from "../src/garuda.ts";

test("Garuda builds as a substantial triangle mesh and is ray-intersectable", () => {
  const garuda = buildGaruda({ includeVishnu: false });
  assert.ok(garuda.mesh.triCount > 8_000);

  const hit = garuda.mesh.intersect(new Ray(new Vec3(0, 4, -15), new Vec3(0, 0, 1)));
  assert.ok(hit);
  assert.ok(Number.isFinite(hit.t) && hit.t > 0);
});

test("Vishnu is a removable rider layer on the reusable Garuda model", () => {
  const garudaOnly = buildGaruda({ includeVishnu: false });
  const withVishnu = buildGaruda();
  assert.ok(withVishnu.mesh.triCount > garudaOnly.mesh.triCount);
});
