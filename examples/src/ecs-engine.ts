/**
 * Runtime consumer: drive an ECS movement sim through the Engine's fixed-step
 * loop. Shows how a game wires components + systems + the render callback.
 *
 *   pnpm --filter @engine/examples ecs
 */
import { Vec3 } from "@engine/math";
import { defineComponent } from "@engine/ecs";
import { Engine } from "@engine/engine";

const Position = defineComponent<Vec3>("Position");
const Velocity = defineComponent<Vec3>("Velocity");

const engine = new Engine({ fixedStep: 1 / 30 });

// spawn a few movers
for (let i = 0; i < 3; i++) {
  const e = engine.world.create();
  engine.world.add(e, Position, new Vec3(0, i, 0)).add(e, Velocity, new Vec3(i + 1, 0, 0));
}

engine.addSystem((world, dt) => {
  for (const [id, p, v] of world.query(Position, Velocity)) {
    world.add(id, Position, p.add(v.scale(dt)));
  }
});

let lastFrame = 0;
engine.onRender((world, alpha) => {
  const positions = [...world.query(Position)].map(([, p]) => `(${p.x.toFixed(2)}, ${p.y})`);
  console.log(`frame ${lastFrame}  alpha=${alpha.toFixed(2)}  ${positions.join("  ")}`);
});

// simulate ~1 second of variable frame times
const frames = [0.05, 0.033, 0.04, 0.1, 0.02, 0.033, 0.05, 0.033];
for (const fdt of frames) {
  lastFrame++;
  engine.frame(fdt);
}
console.log("\nMovers advance by exact fixed steps regardless of frame pacing.");
