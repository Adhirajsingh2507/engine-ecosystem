import { Vec3, Triangle, Ray } from "@engine/math";
import { BVH, type BVHTriangle, type BVHHit } from "./bvh.ts";
import type { Material } from "./tracer.ts";

/**
 * A triangle mesh with one or more materials, backed by a BVH for fast
 * ray intersection. Vertices can have per-vertex normals for smooth shading.
 */

export interface MeshVertex {
  position: Vec3;
  normal: Vec3;
}

export interface TriMeshObj {
  mesh: TriMesh;
  materials: Material[];
}

export class TriMesh {
  private bvh: BVH;
  readonly triCount: number;

  constructor(
    vertices: MeshVertex[],
    indices: number[],
    /** Material index per triangle (length = indices.length / 3). */
    matIndices: number[],
  ) {
    const bvhTris: BVHTriangle[] = [];
    const triCount = indices.length / 3;
    for (let i = 0; i < triCount; i++) {
      const i0 = indices[i * 3];
      const i1 = indices[i * 3 + 1];
      const i2 = indices[i * 3 + 2];
      const v0 = vertices[i0];
      const v1 = vertices[i1];
      const v2 = vertices[i2];
      bvhTris.push({
        tri: new Triangle(v0.position, v1.position, v2.position),
        n0: v0.normal,
        n1: v1.normal,
        n2: v2.normal,
        matIndex: matIndices[i] ?? 0,
      });
    }
    this.triCount = triCount;
    this.bvh = new BVH(bvhTris);
  }

  intersect(ray: Ray, maxT = Infinity): BVHHit | null {
    return this.bvh.intersect(ray, maxT);
  }
}

// ─── Procedural mesh helpers ────────────────────────────────────────

/** Generate a UV-sphere mesh (vertices + indices + normals). */
export function sphereMesh(
  center: Vec3, radius: number, matIndex: number,
  segments = 16, rings = 12,
): { vertices: MeshVertex[]; indices: number[]; matIndices: number[] } {
  const vertices: MeshVertex[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= rings; y++) {
    const phi = (y / rings) * Math.PI;
    for (let x = 0; x <= segments; x++) {
      const theta = (x / segments) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      const normal = new Vec3(nx, ny, nz);
      vertices.push({
        position: center.add(normal.scale(radius)),
        normal,
      });
    }
  }

  const stride = segments + 1;
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * stride + x;
      const b = a + stride;
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  const matIndices = new Array(indices.length / 3).fill(matIndex);
  return { vertices, indices, matIndices };
}

/** Generate a cylinder mesh along the Y axis. */
export function cylinderMesh(
  base: Vec3, topOffset: Vec3, radiusBottom: number, radiusTop: number,
  matIndex: number, segments = 12,
): { vertices: MeshVertex[]; indices: number[]; matIndices: number[] } {
  const vertices: MeshVertex[] = [];
  const indices: number[] = [];
  const top = base.add(topOffset);
  const axis = topOffset.normalize();

  // rings at bottom and top
  for (let ring = 0; ring <= 1; ring++) {
    const c = ring === 0 ? base : top;
    const r = ring === 0 ? radiusBottom : radiusTop;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      // build a tangent frame around axis
      const ref = Math.abs(axis.y) < 0.99 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
      const u = axis.cross(ref).normalize();
      const v = axis.cross(u);
      const nx = Math.cos(theta);
      const nz = Math.sin(theta);
      const radial = u.scale(nx).add(v.scale(nz));
      const normal = radial.normalize();
      vertices.push({
        position: c.add(radial.scale(r)),
        normal,
      });
    }
  }

  const stride = segments + 1;
  for (let i = 0; i < segments; i++) {
    const a = i;
    const b = a + stride;
    indices.push(a, b, a + 1);
    indices.push(a + 1, b, b + 1);
  }

  const matIndices = new Array(indices.length / 3).fill(matIndex);
  return { vertices, indices, matIndices };
}

/** Generate a cone mesh (radius at base, point at top). */
export function coneMesh(
  base: Vec3, tipOffset: Vec3, radius: number,
  matIndex: number, segments = 12,
): { vertices: MeshVertex[]; indices: number[]; matIndices: number[] } {
  const vertices: MeshVertex[] = [];
  const indices: number[] = [];
  const tip = base.add(tipOffset);
  const axis = tipOffset.normalize();
  const height = tipOffset.length();

  // base ring
  const ref = Math.abs(axis.y) < 0.99 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
  const u = axis.cross(ref).normalize();
  const v = axis.cross(u);

  // slope angle for normals
  const slopeAngle = Math.atan2(radius, height);
  const cosSlope = Math.cos(slopeAngle);
  const sinSlope = Math.sin(slopeAngle);

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const nx = Math.cos(theta);
    const nz = Math.sin(theta);
    const radial = u.scale(nx).add(v.scale(nz));
    // normal is tilted inward by the slope angle
    const normal = radial.scale(cosSlope).add(axis.scale(sinSlope)).normalize();
    vertices.push({
      position: base.add(radial.scale(radius)),
      normal,
    });
  }

  // tip vertex
  const tipIdx = vertices.length;
  vertices.push({ position: tip, normal: axis });

  // side triangles
  for (let i = 0; i < segments; i++) {
    indices.push(i, i + 1, tipIdx);
  }

  // base cap
  const baseCenterIdx = vertices.length;
  vertices.push({ position: base, normal: axis.scale(-1) });
  for (let i = 0; i < segments; i++) {
    indices.push(baseCenterIdx, i + 1, i);
  }

  const matIndices = new Array(indices.length / 3).fill(matIndex);
  return { vertices, indices, matIndices };
}

/** Generate a torus mesh. */
export function torusMesh(
  center: Vec3, majorRadius: number, minorRadius: number,
  matIndex: number, axis: Vec3 = new Vec3(0, 1, 0),
  majorSegs = 24, minorSegs = 10,
): { vertices: MeshVertex[]; indices: number[]; matIndices: number[] } {
  const vertices: MeshVertex[] = [];
  const indices: number[] = [];

  const ref = Math.abs(axis.y) < 0.99 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
  const u = axis.cross(ref).normalize();
  const v = axis.cross(u);

  for (let i = 0; i <= majorSegs; i++) {
    const theta = (i / majorSegs) * Math.PI * 2;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const ringCenter = center.add(u.scale(ct * majorRadius)).add(v.scale(st * majorRadius));
    const radialDir = u.scale(ct).add(v.scale(st));

    for (let j = 0; j <= minorSegs; j++) {
      const phi = (j / minorSegs) * Math.PI * 2;
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const normal = radialDir.scale(cp).add(axis.scale(sp));
      vertices.push({
        position: ringCenter.add(normal.scale(minorRadius)),
        normal: normal.normalize(),
      });
    }
  }

  const stride = minorSegs + 1;
  for (let i = 0; i < majorSegs; i++) {
    for (let j = 0; j < minorSegs; j++) {
      const a = i * stride + j;
      const b = a + stride;
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  const matIndices = new Array(indices.length / 3).fill(matIndex);
  return { vertices, indices, matIndices };
}

/** Combine multiple mesh data arrays into a single TriMesh. */
export function combineMeshes(
  parts: { vertices: MeshVertex[]; indices: number[]; matIndices: number[] }[],
  materials: Material[],
): TriMeshObj {
  const allVerts: MeshVertex[] = [];
  const allIndices: number[] = [];
  const allMats: number[] = [];

  for (const part of parts) {
    const offset = allVerts.length;
    allVerts.push(...part.vertices);
    for (const idx of part.indices) allIndices.push(idx + offset);
    allMats.push(...part.matIndices);
  }

  return {
    mesh: new TriMesh(allVerts, allIndices, allMats),
    materials,
  };
}
