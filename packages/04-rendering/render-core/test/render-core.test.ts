import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "@engine/math";
import {
  rgb, srgbToLinear, linearToSrgb, luminance,
  standardMaterial, f0,
  pointAttenuation, spotCone, directionalShadowMatrix,
  RenderGraph,
} from "../src/index.ts";

test("sRGB ↔ linear round-trips and anchors at 0 and 1", () => {
  assert.equal(srgbToLinear(0), 0);
  assert.ok(Math.abs(srgbToLinear(1) - 1) < 1e-12);
  for (const c of [0.1, 0.5, 0.75, 0.9]) {
    assert.ok(Math.abs(linearToSrgb(srgbToLinear(c)) - c) < 1e-9);
  }
  assert.ok(Math.abs(luminance(rgb(1, 1, 1)) - 1) < 1e-12);
});

test("material F0: dielectric ≈ 0.04, metal = albedo", () => {
  const dielectric = f0(standardMaterial({ metalness: 0, albedo: rgb(0.9, 0.1, 0.1) }));
  assert.ok(Math.abs(dielectric.r - 0.04) < 1e-9 && Math.abs(dielectric.g - 0.04) < 1e-9);
  const metal = f0(standardMaterial({ metalness: 1, albedo: rgb(0.9, 0.1, 0.1) }));
  assert.ok(Math.abs(metal.r - 0.9) < 1e-9 && Math.abs(metal.b - 0.1) < 1e-9);
});

test("point attenuation is 1 at source, 0 at range, monotonic decreasing", () => {
  assert.equal(pointAttenuation(0, 10), 1);
  assert.equal(pointAttenuation(10, 10), 0);
  assert.equal(pointAttenuation(20, 10), 0); // beyond range
  let prev = Infinity;
  for (let d = 0; d < 10; d += 0.5) {
    const a = pointAttenuation(d, 10);
    assert.ok(a <= prev, `attenuation should not increase at d=${d}`);
    prev = a;
  }
});

test("spot cone: full inside inner, zero outside outer, smooth between", () => {
  const spot = {
    kind: "spot" as const, position: Vec3.zero, direction: new Vec3(0, 0, -1),
    color: rgb(1, 1, 1), intensity: 1, range: 10,
    innerAngle: Math.PI / 12, outerAngle: Math.PI / 6,
  };
  assert.equal(spotCone(spot, new Vec3(0, 0, -1)), 1); // straight ahead
  assert.equal(spotCone(spot, new Vec3(0, 1, 0)), 0); // 90° off axis
  const mid = spotCone(spot, new Vec3(Math.sin(Math.PI / 8), 0, -Math.cos(Math.PI / 8)));
  assert.ok(mid > 0 && mid < 1);
});

test("directional shadow matrix frames the scene sphere in NDC", () => {
  const m = directionalShadowMatrix(new Vec3(-1, -1, -1), new Vec3(5, 0, 5), 10);
  const c = m.transformPoint(new Vec3(5, 0, 5)); // sphere centre → NDC origin-ish
  assert.ok(Math.abs(c.x) < 1e-6 && Math.abs(c.y) < 1e-6);
  assert.ok(c.z >= -1.0001 && c.z <= 1.0001, "centre within depth range");
  // a point on the sphere maps inside the [-1,1] frustum
  const edge = m.transformPoint(new Vec3(5 + 10, 0, 5));
  assert.ok(Math.abs(edge.x) <= 1.0001 && Math.abs(edge.y) <= 1.0001);
});

test("render graph compiles passes in dependency order", () => {
  // classic forward+post: shadow → lighting → bloom → composite
  const g = new RenderGraph()
    .addPass({ name: "composite", reads: ["hdr", "bloom"], writes: ["screen"] })
    .addPass({ name: "bloom", reads: ["hdr"], writes: ["bloom"] })
    .addPass({ name: "lighting", reads: ["shadowMap"], writes: ["hdr"] })
    .addPass({ name: "shadow", writes: ["shadowMap"] });
  const order = g.compile().map((p) => p.name);
  const idx = (n: string) => order.indexOf(n);
  assert.ok(idx("shadow") < idx("lighting"));
  assert.ok(idx("lighting") < idx("bloom"));
  assert.ok(idx("bloom") < idx("composite"));
  assert.ok(idx("lighting") < idx("composite"));
});

test("render graph detects a cycle", () => {
  const g = new RenderGraph()
    .addPass({ name: "a", reads: ["y"], writes: ["x"] })
    .addPass({ name: "b", reads: ["x"], writes: ["y"] });
  assert.throws(() => g.compile(), /cycle/);
});

test("resource lifetimes span first write to last read", () => {
  const g = new RenderGraph()
    .addPass({ name: "shadow", writes: ["shadowMap"] })
    .addPass({ name: "lighting", reads: ["shadowMap"], writes: ["hdr"] })
    .addPass({ name: "composite", reads: ["hdr"], writes: ["screen"] });
  const order = g.compile();
  const life = g.resourceLifetimes(order);
  assert.deepEqual(life.get("shadowMap"), { first: 0, last: 1 }); // written@0, last read@1
  assert.deepEqual(life.get("hdr"), { first: 1, last: 2 });
});
