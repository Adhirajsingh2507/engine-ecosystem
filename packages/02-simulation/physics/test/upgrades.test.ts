import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3, Mat3 } from "@engine/math";
import { Aabb } from "@engine/geometry";
import { RigidBody, World, aabbAabbContact, resolveContact } from "../src/index.ts";

test("inertia tensor: spinning about a low-inertia axis accelerates faster", () => {
  // tensor with small Ixx, large Izz → same torque yields more ωx than ωz
  const tensor = Mat3.diagonal(1, 5, 10);
  const bx = new RigidBody({ mass: 1, inertiaTensor: tensor });
  const bz = new RigidBody({ mass: 1, inertiaTensor: tensor });
  bx.applyTorque(new Vec3(1, 0, 0));
  bz.applyTorque(new Vec3(0, 0, 1));
  bx.integrate(0.01);
  bz.integrate(0.01);
  assert.ok(bx.angularVelocity.x > bz.angularVelocity.z, "low-inertia axis spins up faster");
  assert.ok(Math.abs(bx.angularVelocity.x - 0.01 / 1) < 1e-9); // ω = τ·Iinv·dt
  assert.ok(Math.abs(bz.angularVelocity.z - 0.01 / 10) < 1e-9);
});

test("isotropic tensor matches the scalar path", () => {
  const scalar = new RigidBody({ mass: 2, inertia: 3 });
  const tensor = new RigidBody({ mass: 2, inertiaTensor: Mat3.diagonal(3, 3, 3) });
  const tq = new Vec3(0.4, -0.2, 0.7);
  scalar.applyTorque(tq);
  tensor.applyTorque(tq);
  scalar.integrate(0.02);
  tensor.integrate(0.02);
  assert.ok(scalar.angularVelocity.equals(tensor.angularVelocity));
});

test("friction opposes sliding: a puck sliding on a floor slows down", () => {
  const world = new World(new Vec3(0, -9.81, 0), { restitution: 0, friction: 0.5, cellSize: 4 });
  world.add(new RigidBody({ mass: 0, position: new Vec3(0, -1, 0), collider: { kind: "box", halfExtents: new Vec3(20, 1, 20) } }));
  const puck = world.add(new RigidBody({ mass: 1, position: new Vec3(0, 0.5, 0), velocity: new Vec3(4, 0, 0), collider: { kind: "sphere", radius: 0.5 } }));

  const vx0 = puck.velocity.x;
  for (let i = 0; i < 120; i++) world.step(1 / 60); // 2s
  assert.ok(puck.velocity.x < vx0, "friction should reduce horizontal speed");
  assert.ok(puck.velocity.x >= 0, "friction should not reverse the slide");
});

test("box↔box: overlapping boxes report the least-penetration axis", () => {
  const a = Aabb.fromCenter(new Vec3(0, 0, 0), new Vec3(1, 1, 1));
  const b = Aabb.fromCenter(new Vec3(1.5, 0.2, 0), new Vec3(1, 1, 1)); // most overlap, thin gap on x
  const c = aabbAabbContact(a, b);
  assert.ok(c);
  assert.ok(c!.normal.equals(new Vec3(1, 0, 0)), "normal along the min-overlap x axis, a→b");
  assert.ok(Math.abs(c!.depth - 0.5) < 1e-9);
});

test("box↔box: separated boxes → no contact", () => {
  const a = Aabb.fromCenter(Vec3.zero, new Vec3(1, 1, 1));
  const b = Aabb.fromCenter(new Vec3(3, 0, 0), new Vec3(1, 1, 1));
  assert.equal(aabbAabbContact(a, b), null);
});

test("box↔box in a world: a box settles on top of a static box", () => {
  const world = new World(new Vec3(0, -9.81, 0), { restitution: 0, cellSize: 4, iterations: 4 });
  const floor = world.add(new RigidBody({ mass: 0, position: new Vec3(0, -1, 0), collider: { kind: "box", halfExtents: new Vec3(10, 1, 10) } }));
  const crate = world.add(new RigidBody({ mass: 1, position: new Vec3(0, 1, 0), collider: { kind: "box", halfExtents: new Vec3(0.5, 0.5, 0.5) } }));
  for (let i = 0; i < 300; i++) world.step(1 / 60);
  assert.ok(floor.position.equals(new Vec3(0, -1, 0)), "static floor unmoved");
  // floor top y=0; crate half-height 0.5 ⇒ rests near y≈0.5
  assert.ok(crate.position.y > 0.35 && crate.position.y < 0.7, `crate rested at y=${crate.position.y}`);
});

test("friction defaults off: existing 2-arg resolveContact unchanged", () => {
  const a = new RigidBody({ mass: 1, velocity: new Vec3(1, 1, 0) });
  const b = new RigidBody({ mass: 1, velocity: new Vec3(-1, 1, 0) });
  resolveContact(a, b, { normal: new Vec3(1, 0, 0), depth: 0.1, point: Vec3.zero }, 1);
  // tangential (y) components must be untouched with no friction arg
  assert.equal(a.velocity.y, 1);
  assert.equal(b.velocity.y, 1);
});
