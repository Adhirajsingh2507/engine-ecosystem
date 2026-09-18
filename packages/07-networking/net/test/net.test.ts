import { test } from "node:test";
import assert from "node:assert/strict";
import { ByteWriter, ByteReader, SnapshotBuffer, Predictor, diff, apply } from "../src/index.ts";

test("serialization round-trips mixed types in order", () => {
  const w = new ByteWriter();
  w.u8(200).u16(50000).u32(4_000_000_000).i32(-123456).f32(1.5).f64(Math.PI).varint(300).string("héllo").vec3({ x: 1, y: -2, z: 3 });
  const r = new ByteReader(w.bytes());
  assert.equal(r.u8(), 200);
  assert.equal(r.u16(), 50000);
  assert.equal(r.u32(), 4_000_000_000);
  assert.equal(r.i32(), -123456);
  assert.ok(Math.abs(r.f32() - 1.5) < 1e-6);
  assert.equal(r.f64(), Math.PI);
  assert.equal(r.varint(), 300);
  assert.equal(r.string(), "héllo");
  assert.deepEqual(r.vec3(), { x: 1, y: -2, z: 3 });
  assert.equal(r.remaining, 0);
});

test("ByteWriter grows past its initial capacity", () => {
  const w = new ByteWriter(4);
  for (let i = 0; i < 100; i++) w.u32(i);
  const r = new ByteReader(w.bytes());
  for (let i = 0; i < 100; i++) assert.equal(r.u32(), i);
});

test("snapshot buffer interpolates between snapshots", () => {
  const buf = new SnapshotBuffer<{ x: number }>((a, b, t) => ({ x: a.x + (b.x - a.x) * t }));
  buf.push(0, { x: 0 });
  buf.push(100, { x: 10 });
  assert.equal(buf.sample(50)!.x, 5); // halfway
  assert.equal(buf.sample(-10)!.x, 0); // clamp before
  assert.equal(buf.sample(200)!.x, 10); // clamp after
  assert.equal(new SnapshotBuffer<{ x: number }>((a) => a).sample(0), null); // empty
});

test("prediction: correct prediction is a no-op after reconcile", () => {
  // deterministic 1D mover: state.x += input.dx
  interface S { x: number }
  interface I { seq: number; dx: number }
  const step = (s: S, i: I): S => ({ x: s.x + i.dx });

  const client = new Predictor<S, I>(step, { x: 0 });
  client.predict({ seq: 1, dx: 1 });
  client.predict({ seq: 2, dx: 2 });
  client.predict({ seq: 3, dx: 3 });
  assert.equal(client.state.x, 6);

  // server confirms state after input seq 1 (x=1); client replays inputs 2 and 3
  client.reconcile({ x: 1 }, 1);
  assert.equal(client.state.x, 6); // unchanged — prediction was right
  assert.equal(client.pendingCount, 2);
});

test("prediction: a server correction is applied then re-predicted", () => {
  interface S { x: number }
  interface I { seq: number; dx: number }
  const step = (s: S, i: I): S => ({ x: s.x + i.dx });
  const client = new Predictor<S, I>(step, { x: 0 });
  client.predict({ seq: 1, dx: 5 });
  client.predict({ seq: 2, dx: 5 }); // client thinks x=10
  // server says after seq 1 the true x was 3 (e.g. hit a wall); replay seq 2
  client.reconcile({ x: 3 }, 1);
  assert.equal(client.state.x, 8); // 3 + 5
  assert.equal(client.pendingCount, 1);
});

test("delta replication sends only changed fields", () => {
  const prev = { hp: 100, x: 0, y: 0 };
  const next = { hp: 100, x: 5, y: 0 };
  const d = diff(prev, next);
  assert.deepEqual(d, { x: 5 }); // only x changed
  assert.deepEqual(apply(prev, d), next);
});
