import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "@engine/math";
import { RigidBody, World } from "../src/index.ts";

test("no gravity: two spheres closing head-on collide and end up separating", () => {
  const world = new World(Vec3.zero, { restitution: 1, cellSize: 2 });
  const a = world.add(new RigidBody({ mass: 1, position: new Vec3(-1, 0, 0), velocity: new Vec3(1, 0, 0), collider: { kind: "sphere", radius: 1.2 } }));
  const b = world.add(new RigidBody({ mass: 1, position: new Vec3(1, 0, 0), velocity: new Vec3(-1, 0, 0), collider: { kind: "sphere", radius: 1.2 } }));

  world.step(1 / 60);

  // equal-mass elastic head-on → they swap and are now moving apart
  assert.ok(a.velocity.x < 0, "a should rebound toward -x");
  assert.ok(b.velocity.x > 0, "b should rebound toward +x");
});

test("a falling sphere is stopped by a static box floor instead of passing through", () => {
  const world = new World(new Vec3(0, -9.81, 0), { restitution: 0, cellSize: 4 });
  const floor = world.add(new RigidBody({ mass: 0, position: new Vec3(0, -1, 0), collider: { kind: "box", halfExtents: new Vec3(10, 1, 10) } }));
  const ball = world.add(new RigidBody({ mass: 1, position: new Vec3(0, 0.6, 0), collider: { kind: "sphere", radius: 0.5 } }));

  for (let i = 0; i < 240; i++) world.step(1 / 60); // ~4s

  assert.ok(floor.position.equals(new Vec3(0, -1, 0)), "static floor must not move");
  // floor top is y=0; ball radius 0.5 ⇒ it should rest near y≈0.5, never sink far below
  assert.ok(ball.position.y > 0.3, `ball rested at y=${ball.position.y}, expected to sit on the floor`);
  assert.ok(ball.velocity.y > -1, "ball should not still be falling fast");
});

test("collider-less bodies are ignored by the collision pass (pass through)", () => {
  const world = new World(Vec3.zero);
  const a = world.add(new RigidBody({ mass: 1, position: new Vec3(-0.1, 0, 0), velocity: new Vec3(1, 0, 0) }));
  const b = world.add(new RigidBody({ mass: 1, position: new Vec3(0.1, 0, 0), velocity: new Vec3(-1, 0, 0) }));
  world.step(1 / 60);
  // no colliders ⇒ velocities untouched by collision
  assert.ok(a.velocity.equals(new Vec3(1, 0, 0)));
  assert.ok(b.velocity.equals(new Vec3(-1, 0, 0)));
});
