import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "@engine/math";
import { easing } from "@engine/core";
import {
  numberTrack, Clip, findPath, seek, arrive, limitForce,
  Status, sequence, selector, condition, action, invert,
} from "../src/index.ts";

test("number track interpolates and clamps at the ends", () => {
  const t = numberTrack([{ time: 0, value: 0 }, { time: 2, value: 10 }]);
  assert.equal(t.duration, 2);
  assert.equal(t.sample(-1), 0); // clamp low
  assert.equal(t.sample(1), 5); // midpoint
  assert.equal(t.sample(5), 10); // clamp high
});

test("per-segment easing is applied", () => {
  const linear = numberTrack([{ time: 0, value: 0 }, { time: 1, value: 1 }]);
  const eased = numberTrack([{ time: 0, value: 0, ease: easing.easeInQuad }, { time: 1, value: 1 }]);
  assert.equal(linear.sample(0.5), 0.5);
  assert.equal(eased.sample(0.5), 0.25); // easeInQuad(0.5) = 0.25
});

test("Clip samples all tracks and reports max duration", () => {
  const clip = new Clip({
    x: numberTrack([{ time: 0, value: 0 }, { time: 1, value: 10 }]),
    y: numberTrack([{ time: 0, value: 5 }, { time: 2, value: 5 }]),
  });
  assert.equal(clip.duration, 2);
  assert.deepEqual(clip.sample(0.5), { x: 5, y: 5 });
});

test("A* finds a path around a wall", () => {
  // 5x5 grid, a vertical wall at x=2 for y=0..3 (gap at y=4)
  const walkable = (x: number, y: number) => !(x === 2 && y < 4);
  const path = findPath(5, 5, walkable, { x: 0, y: 0 }, { x: 4, y: 0 });
  assert.ok(path, "path should exist through the gap");
  assert.deepEqual(path![0], { x: 0, y: 0 });
  assert.deepEqual(path![path!.length - 1], { x: 4, y: 0 });
  assert.ok(path!.every((p) => walkable(p.x, p.y)), "path stays on walkable cells");
});

test("A* returns null when the goal is walled off", () => {
  const walkable = (x: number) => x !== 2; // full vertical wall, no gap
  assert.equal(findPath(5, 5, walkable, { x: 0, y: 0 }, { x: 4, y: 0 }), null);
});

test("seek points toward the target; arrive slows near it", () => {
  const s = seek(Vec3.zero, Vec3.zero, new Vec3(10, 0, 0), 5);
  assert.ok(s.x > 0 && Math.abs(s.y) < 1e-9);
  // arrive far away ~ full speed; arrive close ~ smaller
  const far = arrive(Vec3.zero, Vec3.zero, new Vec3(100, 0, 0), 5, 10).length();
  const near = arrive(Vec3.zero, Vec3.zero, new Vec3(2, 0, 0), 5, 10).length();
  assert.ok(near < far);
  assert.ok(limitForce(new Vec3(10, 0, 0), 3).length() - 3 < 1e-9);
});

test("behaviour tree: sequence AND, selector OR, invert", () => {
  interface BB { hp: number; hasAmmo: boolean; }
  const alive = condition<BB>((b) => b.hp > 0);
  const hasAmmo = condition<BB>((b) => b.hasAmmo);
  const shoot = action<BB>(() => Status.Success);

  const attack = sequence(alive, hasAmmo, shoot);
  assert.equal(attack({ hp: 10, hasAmmo: true }), Status.Success);
  assert.equal(attack({ hp: 10, hasAmmo: false }), Status.Failure); // stops at hasAmmo
  assert.equal(attack({ hp: 0, hasAmmo: true }), Status.Failure); // stops at alive

  const fallback = selector(hasAmmo, action<BB>(() => Status.Success)); // reload
  assert.equal(fallback({ hp: 1, hasAmmo: false }), Status.Success);
  assert.equal(invert(alive)({ hp: 0, hasAmmo: false }), Status.Success);
});
