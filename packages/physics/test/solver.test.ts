import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3, Sphere, Aabb } from "@engine/math";
import { RigidBody, SpatialHash, sphereSphereContact, resolveContact } from "../src/index.ts";

const X = new Vec3(1, 0, 0);

// a→b contact along +x with some penetration
const contactAlongX = (depth = 0.2) => ({ normal: X, depth, point: Vec3.zero });

test("elastic head-on, equal mass: velocities reverse (momentum + energy conserved)", () => {
  const a = new RigidBody({ mass: 1, velocity: new Vec3(1, 0, 0) });
  const b = new RigidBody({ mass: 1, velocity: new Vec3(-1, 0, 0) });
  resolveContact(a, b, contactAlongX(), 1);
  assert.ok(a.velocity.equals(new Vec3(-1, 0, 0)));
  assert.ok(b.velocity.equals(new Vec3(1, 0, 0)));
});

test("inelastic head-on, equal mass: both stop", () => {
  const a = new RigidBody({ mass: 1, velocity: new Vec3(1, 0, 0) });
  const b = new RigidBody({ mass: 1, velocity: new Vec3(-1, 0, 0) });
  resolveContact(a, b, contactAlongX(), 0);
  assert.ok(a.velocity.equals(Vec3.zero));
  assert.ok(b.velocity.equals(Vec3.zero));
});

test("elastic bounce off a static body: velocity reverses, static unmoved", () => {
  // a static (below), b the falling ball (above). normal a→b = +y
  const floor = new RigidBody({ mass: 0 });
  const ball = new RigidBody({ mass: 1, velocity: new Vec3(0, -1, 0) });
  resolveContact(floor, ball, { normal: new Vec3(0, 1, 0), depth: 0.1, point: Vec3.zero }, 1);
  assert.ok(ball.velocity.equals(new Vec3(0, 1, 0)));
  assert.ok(floor.velocity.equals(Vec3.zero));
});

test("momentum is conserved with unequal masses", () => {
  const a = new RigidBody({ mass: 1, velocity: new Vec3(2, 0, 0) });
  const b = new RigidBody({ mass: 3, velocity: new Vec3(-1, 0, 0) });
  const p0 = a.velocity.scale(a.mass).add(b.velocity.scale(b.mass));
  resolveContact(a, b, contactAlongX(), 0.5);
  const p1 = a.velocity.scale(a.mass).add(b.velocity.scale(b.mass));
  assert.ok(p1.equals(p0)); // Σmv unchanged
  // the lighter body's speed changes more than the heavier one's
  const da = a.velocity.sub(new Vec3(2, 0, 0)).length();
  const db = b.velocity.sub(new Vec3(-1, 0, 0)).length();
  assert.ok(da > db);
});

test("bodies already separating get no impulse (velocity unchanged)", () => {
  const a = new RigidBody({ mass: 1, velocity: new Vec3(-1, 0, 0) });
  const b = new RigidBody({ mass: 1, velocity: new Vec3(1, 0, 0) }); // moving apart along +x
  resolveContact(a, b, contactAlongX(), 1);
  assert.ok(a.velocity.equals(new Vec3(-1, 0, 0)));
  assert.ok(b.velocity.equals(new Vec3(1, 0, 0)));
});

test("two static bodies: no-op", () => {
  const a = new RigidBody({ mass: 0, position: Vec3.zero });
  const b = new RigidBody({ mass: 0, position: X });
  resolveContact(a, b, contactAlongX(0.5), 1);
  assert.ok(a.position.equals(Vec3.zero));
  assert.ok(b.position.equals(X));
});

test("positional correction pushes penetrating bodies apart along the normal", () => {
  const a = new RigidBody({ mass: 1, position: Vec3.zero });
  const b = new RigidBody({ mass: 1, position: new Vec3(0.5, 0, 0) });
  resolveContact(a, b, contactAlongX(0.4), 0); // depth 0.4
  // each moves half of (depth - slop) * 0.8: 0.156, in opposite ±x
  assert.ok(a.position.x < 0);
  assert.ok(b.position.x > 0.5);
  assert.ok(Math.abs((b.position.x - a.position.x) - (0.5 + 0.312)) < 1e-9);
});

test("shallow penetration within slop is not corrected", () => {
  const a = new RigidBody({ mass: 1, position: Vec3.zero });
  const b = new RigidBody({ mass: 1, position: X });
  resolveContact(a, b, contactAlongX(0.005), 0); // below SLOP 0.01
  assert.ok(a.position.equals(Vec3.zero));
  assert.ok(b.position.equals(X));
});

test("pipeline: broadphase → narrowphase → solver makes two spheres bounce", () => {
  const r = 1.2;
  const a = new RigidBody({ mass: 1, position: new Vec3(-1, 0, 0), velocity: new Vec3(1, 0, 0) });
  const b = new RigidBody({ mass: 1, position: new Vec3(1, 0, 0), velocity: new Vec3(-1, 0, 0) });
  const bodies = [a, b];

  // broad phase over the bodies' bounding boxes
  const aabbs = bodies.map((bd) => Aabb.fromCenter(bd.position, new Vec3(r, r, r)));
  const candidates = new SpatialHash(1).pairs(aabbs);
  assert.deepEqual(candidates, [[0, 1]]);

  // narrow phase + resolve each confirmed contact (elastic)
  let resolved = 0;
  for (const [i, j] of candidates) {
    const c = sphereSphereContact(
      new Sphere(bodies[i].position, r),
      new Sphere(bodies[j].position, r),
    );
    if (c) {
      resolveContact(bodies[i], bodies[j], c, 1);
      resolved++;
    }
  }
  assert.equal(resolved, 1);
  // equal-mass elastic head-on → velocities swapped, now separating
  assert.ok(a.velocity.equals(new Vec3(-1, 0, 0)));
  assert.ok(b.velocity.equals(new Vec3(1, 0, 0)));
});
