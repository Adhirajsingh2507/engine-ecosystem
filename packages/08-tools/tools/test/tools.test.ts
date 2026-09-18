import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "@engine/math";
import { Aabb } from "@engine/geometry";
import { parseGlb, glbToMeshData, Profiler, DebugDraw } from "../src/index.ts";

/** Build a minimal valid GLB with one triangle (POSITION + indices, no normals). */
function triangleGlb(): ArrayBuffer {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const indices = new Uint16Array([0, 1, 2]);
  const posBytes = positions.byteLength; // 36
  const idxBytes = indices.byteLength; // 6
  const binLen = Math.ceil((posBytes + idxBytes) / 4) * 4; // pad to 4 → 44
  const bin = new Uint8Array(binLen);
  bin.set(new Uint8Array(positions.buffer), 0);
  bin.set(new Uint8Array(indices.buffer), posBytes);

  const json = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: binLen }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes },
      { buffer: 0, byteOffset: posBytes, byteLength: idxBytes },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  };
  let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = Math.ceil(jsonBytes.length / 4) * 4;
  const padded = new Uint8Array(jsonPad).fill(0x20); // pad with spaces
  padded.set(jsonBytes);
  jsonBytes = padded;

  const total = 12 + 8 + jsonBytes.length + 8 + binLen;
  const buf = new ArrayBuffer(total);
  const dv = new DataView(buf);
  const bytes = new Uint8Array(buf);
  dv.setUint32(0, 0x46546c67, true); // "glTF"
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonBytes.length, true);
  dv.setUint32(16, 0x4e4f534a, true); // "JSON"
  bytes.set(jsonBytes, 20);
  const binHeader = 20 + jsonBytes.length;
  dv.setUint32(binHeader, binLen, true);
  dv.setUint32(binHeader + 4, 0x004e4942, true); // "BIN\0"
  bytes.set(bin, binHeader + 8);
  return buf;
}

test("parseGlb reads positions + indices from a GLB", () => {
  const g = parseGlb(triangleGlb());
  assert.deepEqual(g.positions, [0, 0, 0, 1, 0, 0, 0, 1, 0]);
  assert.deepEqual(g.indices, [0, 1, 2]);
  assert.equal(g.normals, undefined);
});

test("glbToMeshData computes normals when the GLB has none", () => {
  const mesh = glbToMeshData(triangleGlb());
  assert.equal(mesh.vertices.length, 3);
  assert.equal(mesh.indices.length / 3, 1);
  // triangle in the z=0 plane, CCW → normal +z
  assert.ok(mesh.vertices[0].normal.equals(new Vec3(0, 0, 1)));
});

test("parseGlb rejects a non-GLB buffer", () => {
  assert.throws(() => parseGlb(new ArrayBuffer(20)), /bad magic/);
});

test("Profiler records durations with an injected clock", () => {
  let t = 0;
  const p = new Profiler(() => t);
  t = 0; p.begin("frame"); t = 5; assert.equal(p.end("frame"), 5);
  t = 10; p.begin("frame"); t = 13; p.end("frame"); // 3
  const s = p.stats("frame")!;
  assert.equal(s.count, 2);
  assert.equal(s.min, 3);
  assert.equal(s.max, 5);
  assert.equal(s.mean, 4);
  assert.equal(s.last, 3);
  assert.equal(p.stats("missing"), null);
});

test("Profiler.measure times a function and returns its value", () => {
  let t = 0;
  const p = new Profiler(() => t);
  const result = p.measure("work", () => { t += 7; return 42; });
  assert.equal(result, 42);
  assert.equal(p.stats("work")!.last, 7);
});

test("Profiler.end without begin throws", () => {
  assert.throws(() => new Profiler(() => 0).end("nope"), /without a matching begin/);
});

test("DebugDraw: box emits 12 edges; vertexData is interleaved pos+color", () => {
  const dd = new DebugDraw();
  dd.box(new Aabb(new Vec3(-1, -1, -1), new Vec3(1, 1, 1)), new Vec3(1, 0, 0));
  assert.equal(dd.lines.length, 12);
  const data = dd.vertexData();
  assert.equal(data.length, 12 * 12); // 12 lines × 2 endpoints × 6 floats
  // first endpoint colour channels (indices 3,4,5) = red
  assert.equal(data[3], 1); assert.equal(data[4], 0); assert.equal(data[5], 0);
  dd.clear();
  assert.equal(dd.lines.length, 0);
});
