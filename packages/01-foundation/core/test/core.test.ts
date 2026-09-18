import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Rng, clamp, lerp, invLerp, remap, smoothstep, damp, moveTowards, pingPong, wrapAngle,
  easing, FixedTimestep,
} from "../src/index.ts";

test("Rng is deterministic for a given seed and diverges across seeds", () => {
  const a = new Rng(42);
  const b = new Rng(42);
  const c = new Rng(43);
  const seqA = Array.from({ length: 5 }, () => a.next());
  const seqB = Array.from({ length: 5 }, () => b.next());
  const seqC = Array.from({ length: 5 }, () => c.next());
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  assert.ok(seqA.every((x) => x >= 0 && x < 1));
});

test("Rng int is within inclusive bounds; shuffle preserves multiset", () => {
  const rng = new Rng(7);
  for (let i = 0; i < 1000; i++) {
    const n = rng.int(3, 6);
    assert.ok(n >= 3 && n <= 6 && Number.isInteger(n));
  }
  const original = [1, 2, 3, 4, 5];
  const shuffled = new Rng(1).shuffle([...original]);
  assert.deepEqual([...shuffled].sort((x, y) => x - y), original);
});

test("interpolation helpers", () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(lerp(0, 10, 0.25), 2.5);
  assert.equal(invLerp(10, 20, 15), 0.5);
  assert.equal(remap(15, 10, 20, 0, 100), 50);
  assert.equal(smoothstep(0, 1, 0.5), 0.5);
  assert.equal(smoothstep(0, 1, -3), 0); // clamped
  assert.equal(moveTowards(0, 10, 3), 3);
  assert.equal(moveTowards(0, 2, 3), 2); // overshoot snaps to target
  assert.ok(Math.abs(pingPong(1.5, 1) - 0.5) < 1e-12);
  assert.ok(Math.abs(wrapAngle(Math.PI * 2 + 0.5) - 0.5) < 1e-12); // 2π+0.5 → 0.5
  assert.ok(Math.abs(wrapAngle(-Math.PI * 2 - 0.5) + 0.5) < 1e-12); // −2π−0.5 → −0.5
});

test("damp is frame-rate independent to a good approximation", () => {
  // one 0.1s step vs ten 0.01s steps should land at nearly the same value
  const oneBig = damp(0, 100, 5, 0.1);
  let v = 0;
  for (let i = 0; i < 10; i++) v = damp(v, 100, 5, 0.01);
  assert.ok(Math.abs(oneBig - v) < 1e-9);
});

test("easing endpoints are anchored at 0 and 1", () => {
  for (const fn of [easing.easeInOutCubic, easing.easeOutBack, easing.easeOutElastic, easing.easeOutBounce, easing.easeInOutSine]) {
    assert.ok(Math.abs(fn(0) - 0) < 1e-9, `${fn.name}(0)`);
    assert.ok(Math.abs(fn(1) - 1) < 1e-9, `${fn.name}(1)`);
  }
});

test("FixedTimestep runs constant-size steps and reports alpha", () => {
  const ts = new FixedTimestep(0.1, 5);
  const r1 = ts.advance(0.25); // 2 steps consumed, 0.05 left
  assert.equal(r1.steps, 2);
  assert.ok(Math.abs(r1.alpha - 0.5) < 1e-9);

  let count = 0;
  ts.run(0.2, () => count++); // 0.05 leftover + 0.2 = 0.25 → 2 steps
  assert.equal(count, 2);
});

test("FixedTimestep caps catch-up to avoid the spiral of death", () => {
  const ts = new FixedTimestep(0.1, 3);
  const r = ts.advance(10); // huge stall
  assert.equal(r.steps, 3); // capped, not 100
});
