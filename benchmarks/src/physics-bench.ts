import { Vec3 } from "@engine/math";
import { World, RigidBody } from "@engine/physics";
import { bench, report } from "./bench.ts";

/** Build a world of N dynamic spheres over a static box floor. */
function makeWorld(n: number): World {
  const world = new World(new Vec3(0, -9.81, 0), { restitution: 0.3, cellSize: 2 });
  world.add(new RigidBody({ mass: 0, position: new Vec3(0, -1, 0), collider: { kind: "box", halfExtents: new Vec3(50, 1, 50) } }));
  const side = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const x = (i % side) - side / 2;
    const z = Math.floor(i / side) - side / 2;
    world.add(new RigidBody({ mass: 1, position: new Vec3(x, 2 + (i % 3), z), collider: { kind: "sphere", radius: 0.4 } }));
  }
  return world;
}

const dt = 1 / 60;
const w100 = makeWorld(100);
const w500 = makeWorld(500);
const w2000 = makeWorld(2000);

console.log("physics (World.step, one 1/60s tick)");
report([
  bench("100 bodies", () => w100.step(dt)),
  bench("500 bodies", () => w500.step(dt)),
  bench("2000 bodies", () => w2000.step(dt), 800),
]);
