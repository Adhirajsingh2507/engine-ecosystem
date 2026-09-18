import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "@engine/math";
import { defineComponent } from "@engine/ecs";
import { Engine } from "../src/index.ts";

const Position = defineComponent<Vec3>("Position");
const Velocity = defineComponent<Vec3>("Velocity");

test("Engine runs fixed steps and a render callback per frame", () => {
  const engine = new Engine({ fixedStep: 0.1, maxSteps: 10 });
  const e = engine.world.create();
  engine.world.add(e, Position, Vec3.zero).add(e, Velocity, new Vec3(1, 0, 0));

  let simSteps = 0;
  engine.addSystem((world, dt) => {
    simSteps++;
    for (const [id, p, v] of world.query(Position, Velocity)) {
      world.add(id, Position, p.add(v.scale(dt)));
    }
  });

  let renders = 0;
  let lastAlpha = -1;
  engine.onRender((_world, alpha) => {
    renders++;
    lastAlpha = alpha;
  });

  engine.frame(0.25); // 0.25 / 0.1 → 2 fixed steps, 0.05 leftover → alpha 0.5

  assert.equal(simSteps, 2);
  assert.equal(renders, 1);
  assert.ok(Math.abs(lastAlpha - 0.5) < 1e-9);
  // position advanced by 2 * 0.1 * speed(1) = 0.2
  assert.ok(engine.world.get(e, Position)!.equals(new Vec3(0.2, 0, 0)));
});

test("fixed step: identical input is bit-exact; pacing is frame-rate independent to ±1 step", () => {
  const run = (frames: number[]) => {
    const eng = new Engine({ fixedStep: 1 / 60, maxSteps: 100 }); // cap above 60 so neither run is clamped
    let steps = 0;
    eng.addSystem(() => steps++);
    for (const f of frames) eng.frame(f);
    return steps;
  };
  // determinism: same input sequence → identical step count
  assert.equal(run([1.0]), run([1.0]));
  // frame-rate independence: one big frame vs many small ones agree within a
  // single step (float accumulation of 60×(1/60) lands just under 1.0)
  const big = run([1.0]);
  const small = run(Array(60).fill(1 / 60));
  assert.ok(Math.abs(big - small) <= 1, `big=${big} small=${small}`);
  assert.ok(big >= 59 && big <= 60, `~60 steps for 1s at 1/60, got ${big}`);
});
