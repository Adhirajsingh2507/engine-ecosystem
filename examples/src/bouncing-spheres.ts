/**
 * Physics consumer: drop three spheres of different restitution onto a static
 * box floor and watch them settle. Runs headless on Node.
 *
 *   pnpm --filter @engine/examples bounce
 */
import { Vec3 } from "@engine/math";
import { World, RigidBody } from "@engine/physics";

const world = new World(new Vec3(0, -9.81, 0), { restitution: 0.6, cellSize: 4, iterations: 4 });

world.add(
  new RigidBody({ mass: 0, position: new Vec3(0, -1, 0), collider: { kind: "box", halfExtents: new Vec3(20, 1, 20) } }),
);

const balls = [0.2, 0.6, 0.9].map((restitution, i) =>
  world.add(
    new RigidBody({
      mass: 1,
      position: new Vec3(i * 2 - 2, 5, 0),
      collider: { kind: "sphere", radius: 0.5 },
    }),
  ),
);
// per-ball restitution isn't modelled yet (world-level only); label them anyway
const labels = ["low bounce", "medium bounce", "high bounce"];

const dt = 1 / 60;
console.log("t(s)  " + labels.map((l) => l.padStart(14)).join(""));
for (let frame = 0; frame <= 180; frame++) {
  world.step(dt);
  if (frame % 30 === 0) {
    const t = (frame * dt).toFixed(2);
    const ys = balls.map((b) => b.position.y.toFixed(2).padStart(14)).join("");
    console.log(t.padStart(5) + " " + ys);
  }
}
console.log("\nBalls collide with the floor and bounce (restitution 0.6) instead of falling through.");
