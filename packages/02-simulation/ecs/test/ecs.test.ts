import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3, Transform } from "@engine/math";
import { Registry, defineComponent, Signal, SceneNode, Scheduler } from "../src/index.ts";

const Position = defineComponent<Vec3>("Position");
const Velocity = defineComponent<Vec3>("Velocity");
const Tag = defineComponent<string>("Tag");

test("add / get / has / remove / destroy", () => {
  const w = new Registry();
  const e = w.create();
  w.add(e, Position, new Vec3(1, 2, 3));
  assert.ok(w.has(e, Position));
  assert.ok(w.get(e, Position)!.equals(new Vec3(1, 2, 3)));
  w.remove(e, Position);
  assert.ok(!w.has(e, Position));

  w.add(e, Tag, "hero");
  w.destroy(e);
  assert.ok(!w.alive(e));
  assert.equal(w.get(e, Tag), undefined);
});

test("query yields only entities with all requested components", () => {
  const w = new Registry();
  const a = w.create(); w.add(a, Position, Vec3.zero).add(a, Velocity, new Vec3(1, 0, 0));
  const b = w.create(); w.add(b, Position, Vec3.one); // no velocity
  const c = w.create(); w.add(c, Velocity, new Vec3(0, 1, 0)); // no position

  const matched = [...w.query(Position, Velocity)].map(([e]) => e);
  assert.deepEqual(matched, [a]);
});

test("a movement system integrates position from velocity", () => {
  const w = new Registry();
  const e = w.create();
  w.add(e, Position, Vec3.zero).add(e, Velocity, new Vec3(2, 0, 0));

  const scheduler = new Scheduler().add((world, dt) => {
    for (const [id, pos, vel] of world.query(Position, Velocity)) {
      world.add(id, Position, pos.add(vel.scale(dt)));
    }
  });

  scheduler.update(w, 0.5);
  assert.ok(w.get(e, Position)!.equals(new Vec3(1, 0, 0)));
});

test("Signal: subscribe, emit, unsubscribe", () => {
  const hit = new Signal<number>();
  let sum = 0;
  const off = hit.add((n) => (sum += n));
  hit.emit(3);
  hit.emit(4);
  off();
  hit.emit(100); // ignored after unsubscribe
  assert.equal(sum, 7);
});

test("SceneNode world matrix composes parent · child translations", () => {
  const parent = new SceneNode(new Transform(new Vec3(10, 0, 0)));
  const child = parent.add(new SceneNode(new Transform(new Vec3(0, 5, 0))));
  // child origin in world = (10, 5, 0)
  assert.ok(child.worldMatrix().transformPoint(Vec3.zero).equals(new Vec3(10, 5, 0)));
});

test("SceneNode reparenting detaches from the old parent", () => {
  const root = new SceneNode();
  const a = root.add(new SceneNode());
  const b = root.add(new SceneNode());
  const leaf = a.add(new SceneNode());
  b.add(leaf); // move leaf from a to b
  assert.equal(a.children.length, 0);
  assert.deepEqual(b.children, [leaf]);
  assert.equal(leaf.parent, b);
  assert.deepEqual([...root.descendants()].length, 3);
});
