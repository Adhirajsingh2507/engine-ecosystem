import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec2, Vec3 } from "@engine/math";
import {
  MU_EARTH, solveKepler, period, propagate, specificEnergy,
  julianDate, J2000, gmstRadians,
  rk4, scalarOps,
  forwardKinematics2D,
} from "../src/index.ts";

const A = 7_000_000; // ~630 km altitude circular orbit

test("solveKepler inverts Kepler's equation", () => {
  for (const e of [0, 0.1, 0.5, 0.9]) {
    for (const M of [0.3, 1.5, 3.0, 5.5]) {
      const E = solveKepler(M, e);
      assert.ok(Math.abs(E - e * Math.sin(E) - M) < 1e-10, `e=${e} M=${M}`);
    }
  }
});

test("circular equatorial orbit: constant radius, circular speed, ⟂ velocity", () => {
  const el = { a: A, e: 0, i: 0, raan: 0, argp: 0, M0: 0 };
  const s0 = propagate(el, 0);
  assert.ok(Math.abs(s0.position.length() - A) < 1); // r = a
  const vCirc = Math.sqrt(MU_EARTH / A);
  assert.ok(Math.abs(s0.velocity.length() - vCirc) < 1e-3);
  assert.ok(Math.abs(s0.position.dot(s0.velocity)) < 1, "v ⟂ r on a circle");
  assert.ok(s0.position.equals(new Vec3(A, 0, 0), 1)); // starts at periapsis on +x
});

test("propagating a full period returns to the start", () => {
  const el = { a: A, e: 0.1, i: 0.4, raan: 0.5, argp: 0.6, M0: 0.2 };
  const T = period(A);
  const s0 = propagate(el, 0);
  const s1 = propagate(el, T);
  assert.ok(s0.position.distanceTo(s1.position) < 1, "position repeats after one period");
  assert.ok(s0.velocity.distanceTo(s1.velocity) < 1e-3);
});

test("periapsis and apoapsis radii match a(1∓e)", () => {
  const e = 0.2;
  const el = { a: A, e, i: 0, raan: 0, argp: 0, M0: 0 };
  const peri = propagate(el, 0).position.length(); // M0=0 → periapsis
  const apo = propagate(el, period(A) / 2).position.length(); // half period → apoapsis
  assert.ok(Math.abs(peri - A * (1 - e)) < 1);
  assert.ok(Math.abs(apo - A * (1 + e)) < 1);
});

test("specific orbital energy is conserved and equals −μ/2a", () => {
  const el = { a: A, e: 0.3, i: 0.5, raan: 0.1, argp: 0.9, M0: 0 };
  const expected = -MU_EARTH / (2 * A);
  for (const t of [0, 1234, 3600]) {
    assert.ok(Math.abs(specificEnergy(propagate(el, t)) - expected) / Math.abs(expected) < 1e-6);
  }
});

test("Julian Date anchors: Unix epoch and J2000", () => {
  assert.equal(julianDate(new Date("1970-01-01T00:00:00Z")), 2440587.5);
  assert.equal(julianDate(new Date("2000-01-01T12:00:00Z")), J2000);
  const g = gmstRadians(new Date("2000-01-01T12:00:00Z"));
  assert.ok(g >= 0 && g < 2 * Math.PI);
});

test("RK4 integrates dy/dt = y to eᵗ", () => {
  let y = 1;
  const dt = 0.01;
  for (let t = 0; t < 1 - 1e-9; t += dt) y = rk4(y, t, dt, (s) => s, scalarOps);
  assert.ok(Math.abs(y - Math.E) < 1e-6, `got ${y}`);
});

test("planar forward kinematics places the tip correctly", () => {
  assert.ok(forwardKinematics2D([1, 1], [0, 0])[2].equals(new Vec2(2, 0)));
  assert.ok(forwardKinematics2D([1, 1], [Math.PI / 2, 0])[2].equals(new Vec2(0, 2)));
  assert.ok(forwardKinematics2D([1, 1], [0, Math.PI / 2])[2].equals(new Vec2(1, 1)));
});
