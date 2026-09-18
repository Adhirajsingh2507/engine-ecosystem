import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3, Quaternion } from "@engine/math";
import { RigidBody, World } from "../src/index.ts";

const X = new Vec3(1, 0, 0);
const Z = new Vec3(0, 0, 1);

// ---------- linear ----------

test("inverseMass: dynamic vs static", () => {
  assert.equal(new RigidBody({ mass: 2 }).inverseMass, 0.5);
  const s = new RigidBody({ mass: 0 });
  assert.equal(s.inverseMass, 0);
  assert.ok(s.isStatic);
});

test("negative mass / inertia are rejected", () => {
  assert.throws(() => new RigidBody({ mass: -1 }), RangeError);
  assert.throws(() => new RigidBody({ mass: 1, inertia: -1 }), RangeError);
});

test("constant velocity, no force: x += v·dt", () => {
  const b = new RigidBody({ velocity: new Vec3(2, 0, 0) });
  b.integrate(0.5);
  assert.ok(b.position.equals(new Vec3(1, 0, 0)));
  assert.ok(b.velocity.equals(new Vec3(2, 0, 0)));
});

test("applyForce accelerates by F/m and is cleared after the step", () => {
  const b = new RigidBody({ mass: 2 });
  b.applyForce(new Vec3(10, 0, 0)); // a = 5 m/s²
  b.integrate(1);
  assert.ok(b.velocity.equals(new Vec3(5, 0, 0)));
  assert.ok(b.position.equals(new Vec3(5, 0, 0))); // semi-implicit: uses new v
  b.integrate(1); // force cleared → velocity constant
  assert.ok(b.velocity.equals(new Vec3(5, 0, 0)));
});

test("static body ignores forces", () => {
  const s = new RigidBody({ mass: 0, position: new Vec3(1, 2, 3) });
  s.applyForce(new Vec3(1000, 0, 0));
  s.integrate(1);
  assert.ok(s.position.equals(new Vec3(1, 2, 3)));
});

// ---------- angular ----------

test("defaults: identity orientation, zero angular velocity, inertia = mass", () => {
  const b = new RigidBody({ mass: 3 });
  assert.ok(b.orientation.equals(Quaternion.identity));
  assert.ok(b.angularVelocity.equals(Vec3.zero));
  assert.equal(b.inertia, 3);
  assert.ok(Math.abs(b.inverseInertia - 1 / 3) < 1e-12);
});

test("applyTorque spins up angular velocity by τ·I⁻¹·dt, then clears", () => {
  const b = new RigidBody({ mass: 1 }); // inertia 1 → invInertia 1
  b.applyTorque(new Vec3(0, 0, 2)); // angular accel = 2
  b.integrate(0.5);
  assert.ok(b.angularVelocity.equals(new Vec3(0, 0, 1)));
  const wBefore = b.angularVelocity;
  b.integrate(0.5); // torque cleared → angular velocity constant
  assert.ok(b.angularVelocity.equals(wBefore));
});

test("constant angular velocity integrates to the expected rotation", () => {
  const b = new RigidBody({ mass: 1, angularVelocity: Z }); // 1 rad/s about Z
  for (let i = 0; i < 1000; i++) b.integrate(0.001); // total ≈ 1 rad
  const expected = Quaternion.fromAxisAngle(Z, 1);
  // compare via a rotated vector; first-order integrator → loose tolerance
  assert.ok(b.orientation.rotate(X).equals(expected.rotate(X), 1e-2));
});

test("orientation stays normalized after integration", () => {
  const b = new RigidBody({ mass: 1, angularVelocity: new Vec3(3, -2, 1) });
  for (let i = 0; i < 100; i++) b.integrate(0.01);
  assert.ok(Math.abs(b.orientation.length() - 1) < 1e-9);
});

test("static body does not rotate under torque", () => {
  const s = new RigidBody({ mass: 0, angularVelocity: Vec3.zero });
  s.applyTorque(new Vec3(0, 0, 1000));
  s.integrate(1);
  assert.ok(s.angularVelocity.equals(Vec3.zero));
  assert.ok(s.orientation.equals(Quaternion.identity));
});

test("inertia 0 locks rotation on an otherwise-dynamic body", () => {
  const b = new RigidBody({ mass: 1, inertia: 0 });
  assert.equal(b.inverseInertia, 0);
  b.applyTorque(new Vec3(0, 0, 5));
  b.integrate(1);
  assert.ok(b.orientation.equals(Quaternion.identity));
});

test("transform getter exposes pose with unit scale", () => {
  const q = Quaternion.fromAxisAngle(Z, 0.5);
  const b = new RigidBody({ mass: 1, position: new Vec3(1, 2, 3), orientation: q });
  const t = b.transform;
  assert.ok(t.position.equals(new Vec3(1, 2, 3)));
  assert.ok(t.rotation.equals(q));
  assert.ok(t.scale.equals(Vec3.one));
});

// ---------- world ----------

test("World applies gravity as pure acceleration (mass-independent)", () => {
  const w = new World(new Vec3(0, -10, 0));
  const light = w.add(new RigidBody({ mass: 1 }));
  const heavy = w.add(new RigidBody({ mass: 100 }));
  w.step(0.1);
  assert.ok(light.velocity.equals(new Vec3(0, -1, 0)));
  assert.ok(heavy.velocity.equals(new Vec3(0, -1, 0)));
  assert.ok(light.position.equals(heavy.position));
});

test("World leaves static bodies (the ground) put", () => {
  const w = new World(new Vec3(0, -10, 0));
  const ground = w.add(new RigidBody({ mass: 0, position: Vec3.zero }));
  w.step(0.1);
  assert.ok(ground.position.equals(Vec3.zero));
});
