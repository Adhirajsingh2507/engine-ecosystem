import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "@engine/math";
import { TriMesh } from "@engine/geometry";
import { ValueNoise, Heightmap } from "../src/index.ts";

test("ValueNoise is deterministic per seed and stays in [0,1]", () => {
  const a = new ValueNoise(7);
  const b = new ValueNoise(7);
  const c = new ValueNoise(8);
  assert.equal(a.noise2D(3.2, 5.7), b.noise2D(3.2, 5.7));
  assert.notEqual(a.noise2D(3.2, 5.7), c.noise2D(3.2, 5.7));
  for (let i = 0; i < 200; i++) {
    const v = a.fbm2D(i * 0.3, i * 0.7);
    assert.ok(v >= 0 && v <= 1, `fbm out of range: ${v}`);
  }
});

test("noise is continuous (small step → small change)", () => {
  const n = new ValueNoise(1);
  const a = n.noise2D(10.0, 10.0);
  const b = n.noise2D(10.01, 10.0);
  assert.ok(Math.abs(a - b) < 0.05, "value noise should be smooth");
});

test("flat heightmap: zero slope, upward normal, traversable", () => {
  const hm = new Heightmap(8, 8, 1, new Float32Array(64)); // all zero
  assert.ok(hm.normalAt(3, 3).equals(new Vec3(0, 1, 0)));
  assert.ok(Math.abs(hm.slopeAt(3, 3)) < 1e-9);
  assert.equal(hm.roughnessAt(3, 3), 0);
  assert.ok(hm.traversableAt(3, 3, 0.1));
});

test("a 45° ramp reports ~45° slope and is blocked by a tighter limit", () => {
  // height increases by exactly cellSize per step in +x → 45° slope
  const w = 6, d = 6, cell = 1;
  const heights = new Float32Array(w * d);
  for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) heights[z * w + x] = x * cell;
  const hm = new Heightmap(w, d, cell, heights);
  const slope = hm.slopeAt(3, 3);
  assert.ok(Math.abs(slope - Math.PI / 4) < 1e-6, `slope ${slope}`);
  assert.ok(!hm.traversableAt(3, 3, Math.PI / 6)); // 30° limit blocks a 45° slope
  assert.ok(hm.traversableAt(3, 3, Math.PI / 3)); // 60° limit allows it
});

test("bilinear sampling interpolates between cells", () => {
  const heights = new Float32Array([0, 0, 10, 10]); // 2x2, +y row jumps 0→10
  const hm = new Heightmap(2, 2, 1, heights);
  assert.equal(hm.sampleBilinear(0.5, 0), 0);
  assert.equal(hm.sampleBilinear(0, 0.5), 5); // halfway between z=0 (0) and z=1 (10)
});

test("toMesh produces a BVH-intersectable TriMesh with the right triangle count", () => {
  const hm = Heightmap.fromNoise(16, 16, 1, { seed: 3, amplitude: 4 });
  const data = hm.toMesh();
  // (w-1)*(d-1)*2 triangles
  assert.equal(data.indices.length / 3, 15 * 15 * 2);
  const mesh = new TriMesh(data.vertices, data.indices, data.matIndices);
  assert.equal(mesh.triCount, 15 * 15 * 2);
});
