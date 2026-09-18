import { test } from "node:test";
import assert from "node:assert/strict";
import { Aabb, Vec3, aabbAabb } from "@engine/math";
import { SpatialHash } from "../src/index.ts";

const box = (min: [number, number, number], max: [number, number, number]) =>
  new Aabb(new Vec3(...min), new Vec3(...max));

test("cellSize must be positive", () => {
  assert.throws(() => new SpatialHash(0), RangeError);
  assert.throws(() => new SpatialHash(-1), RangeError);
});

test("overlapping boxes are reported as a candidate pair", () => {
  const hash = new SpatialHash(1);
  const pairs = hash.pairs([box([0, 0, 0], [2, 2, 2]), box([1, 1, 1], [3, 3, 3])]);
  assert.deepEqual(pairs, [[0, 1]]);
});

test("distant boxes in different cells produce no pairs", () => {
  const hash = new SpatialHash(1);
  const pairs = hash.pairs([box([0, 0, 0], [1, 1, 1]), box([100, 100, 100], [101, 101, 101])]);
  assert.deepEqual(pairs, []);
});

test("three boxes: only the overlapping two pair up", () => {
  const hash = new SpatialHash(1);
  const pairs = hash.pairs([
    box([0, 0, 0], [2, 2, 2]),
    box([1, 1, 1], [3, 3, 3]),
    box([50, 50, 50], [51, 51, 51]),
  ]);
  assert.deepEqual(pairs, [[0, 1]]);
});

test("a pair is emitted once even when the boxes span many shared cells", () => {
  const hash = new SpatialHash(1);
  // two big boxes overlapping across an 11×11×11 block of cells
  const pairs = hash.pairs([box([0, 0, 0], [10, 10, 10]), box([5, 5, 5], [15, 15, 15])]);
  assert.equal(pairs.length, 1);
  assert.deepEqual(pairs[0], [0, 1]);
});

test("no false negatives: every truly-overlapping pair is a candidate", () => {
  const hash = new SpatialHash(4);
  const boxes = [
    box([0, 0, 0], [3, 3, 3]),
    box([2, 2, 2], [6, 6, 6]), // overlaps 0
    box([20, 0, 0], [23, 3, 3]), // isolated
    box([5.5, 5.5, 5.5], [9, 9, 9]), // overlaps 1
  ];
  const candidates = hash.pairs(boxes);
  const key = ([i, j]: [number, number]) => `${i},${j}`;
  const candidateSet = new Set(candidates.map(key));
  // brute-force every real overlap and assert it's covered by broad-phase
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (aabbAabb(boxes[i], boxes[j])) {
        assert.ok(candidateSet.has(`${i},${j}`), `missed overlapping pair ${i},${j}`);
      }
    }
  }
});

test("two-phase: broad-phase candidate can be a false positive that narrow-phase rejects", () => {
  const hash = new SpatialHash(10); // one big cell covers both
  const a = box([0, 0, 0], [1, 1, 1]);
  const b = box([5, 5, 5], [6, 6, 6]); // same cell (all coords floor to 0), but no overlap
  const candidates = hash.pairs([a, b]);
  assert.deepEqual(candidates, [[0, 1]]); // broad-phase pairs them
  assert.equal(aabbAabb(a, b), false); // narrow-phase filters them out
});
