import { Vec3 } from "@engine/math";
import type { MeshData, MeshVertex } from "@engine/geometry";

/**
 * Headless GLB (binary glTF 2.0) geometry loader — the pure core of the asset
 * pipeline. Parses the container and vertex accessors into plain arrays / a
 * `MeshData`, with **no browser dependency** (no fetch, no image decode). The
 * app layer keeps the browser-only bits (downloading, texture decoding); this
 * runs and is tested on Node.
 *
 * ponytail: first mesh/primitive only, uncompressed accessors (float positions/
 * normals/uvs, ushort/uint indices). Extend to multi-primitive / Draco when a
 * real asset needs it.
 */
export interface GlbGeometry {
  positions: number[]; // xyz flat
  normals?: number[];
  uvs?: number[];
  indices: number[];
}

const COMPONENT_BYTES: Record<number, number> = { 5123: 2, 5125: 4, 5126: 4 }; // ushort, uint, float
const TYPE_COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

export function parseGlb(buffer: ArrayBuffer): GlbGeometry {
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB file (bad magic)");
  if (dv.getUint32(4, true) !== 2) throw new Error("unsupported GLB version (need 2)");

  const jsonLen = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== 0x4e4f534a) throw new Error("expected a JSON chunk");
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLen)));

  const binHeader = 20 + jsonLen;
  if (dv.getUint32(binHeader + 4, true) !== 0x004e4942) throw new Error("expected a BIN chunk");
  const binOff = binHeader + 8;

  const readAccessor = (index: number): number[] => {
    const a = json.accessors[index];
    const view = json.bufferViews[a.bufferView];
    const comps = TYPE_COMPONENTS[a.type];
    const size = COMPONENT_BYTES[a.componentType];
    if (!comps || !size) throw new Error(`unsupported accessor (${a.type}/${a.componentType})`);
    const stride = view.byteStride ?? size * comps;
    const base = binOff + (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const out: number[] = [];
    for (let i = 0; i < a.count; i++) {
      const elem = base + i * stride;
      for (let c = 0; c < comps; c++) {
        const off = elem + c * size;
        out.push(
          a.componentType === 5126 ? dv.getFloat32(off, true)
          : a.componentType === 5123 ? dv.getUint16(off, true)
          : dv.getUint32(off, true),
        );
      }
    }
    return out;
  };

  const prim = json.meshes[0].primitives[0];
  if (prim.attributes.POSITION === undefined) throw new Error("primitive has no POSITION");
  const positions = readAccessor(prim.attributes.POSITION);
  const indices = prim.indices !== undefined
    ? readAccessor(prim.indices)
    : Array.from({ length: positions.length / 3 }, (_, i) => i); // non-indexed → sequential
  return {
    positions,
    normals: prim.attributes.NORMAL !== undefined ? readAccessor(prim.attributes.NORMAL) : undefined,
    uvs: prim.attributes.TEXCOORD_0 !== undefined ? readAccessor(prim.attributes.TEXCOORD_0) : undefined,
    indices,
  };
}

/** Per-vertex smooth normals from face normals (used when a GLB omits NORMAL). */
function computeNormals(positions: number[], indices: number[]): number[] {
  const n = new Array(positions.length).fill(0);
  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t], i1 = indices[t + 1], i2 = indices[t + 2];
    const p0 = new Vec3(positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]);
    const p1 = new Vec3(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
    const p2 = new Vec3(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);
    const fn = p1.sub(p0).cross(p2.sub(p0));
    for (const i of [i0, i1, i2]) {
      n[i * 3] += fn.x; n[i * 3 + 1] += fn.y; n[i * 3 + 2] += fn.z;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const v = new Vec3(n[i], n[i + 1], n[i + 2]).normalize();
    n[i] = v.x; n[i + 1] = v.y; n[i + 2] = v.z;
  }
  return n;
}

/** Convert a GLB buffer into engine `MeshData` (computing normals if absent). */
export function glbToMeshData(buffer: ArrayBuffer, matIndex = 0): MeshData {
  const g = parseGlb(buffer);
  const normals = g.normals ?? computeNormals(g.positions, g.indices);
  const count = g.positions.length / 3;
  const vertices: MeshVertex[] = new Array(count);
  for (let i = 0; i < count; i++) {
    vertices[i] = {
      position: new Vec3(g.positions[i * 3], g.positions[i * 3 + 1], g.positions[i * 3 + 2]),
      normal: new Vec3(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]),
    };
  }
  return { vertices, indices: g.indices, matIndices: new Array(g.indices.length / 3).fill(matIndex) };
}
