import { Vec3, Aabb, Ray, Triangle, rayTriangle, type TriHit } from "@engine/math";

/**
 * A flat, SAH-inspired BVH over an indexed triangle soup.
 * Each leaf holds a contiguous span of triangles (≤ MAX_LEAF).
 * Construction sorts triangles along the longest AABB axis and splits at the
 * centroid midpoint — simple, fast to build, and good-enough for offline renders.
 */

const MAX_LEAF = 4;

interface BVHNode {
  aabb: Aabb;
  /** If leaf: start index into the triangle array. -1 for internal nodes. */
  start: number;
  /** If leaf: count of triangles. 0 for internal. */
  count: number;
  /** Index of the left child in the flat array. Right = left + 1. */
  left: number;
  right: number;
}

export interface BVHTriangle {
  tri: Triangle;
  /** Per-vertex normals for smooth shading (optional — falls back to face normal). */
  n0?: Vec3;
  n1?: Vec3;
  n2?: Vec3;
  /** Index into a material table. */
  matIndex: number;
}

export interface BVHHit {
  t: number;
  /** Interpolated normal (smooth if per-vertex normals exist, else face normal). */
  normal: Vec3;
  point: Vec3;
  matIndex: number;
}

function triAabb(tri: Triangle): Aabb {
  return new Aabb(
    new Vec3(
      Math.min(tri.v0.x, tri.v1.x, tri.v2.x),
      Math.min(tri.v0.y, tri.v1.y, tri.v2.y),
      Math.min(tri.v0.z, tri.v1.z, tri.v2.z),
    ),
    new Vec3(
      Math.max(tri.v0.x, tri.v1.x, tri.v2.x),
      Math.max(tri.v0.y, tri.v1.y, tri.v2.y),
      Math.max(tri.v0.z, tri.v1.z, tri.v2.z),
    ),
  );
}

function unionAabb(a: Aabb, b: Aabb): Aabb {
  return new Aabb(
    new Vec3(Math.min(a.min.x, b.min.x), Math.min(a.min.y, b.min.y), Math.min(a.min.z, b.min.z)),
    new Vec3(Math.max(a.max.x, b.max.x), Math.max(a.max.y, b.max.y), Math.max(a.max.z, b.max.z)),
  );
}

function centroid(tri: Triangle): Vec3 {
  return new Vec3(
    (tri.v0.x + tri.v1.x + tri.v2.x) / 3,
    (tri.v0.y + tri.v1.y + tri.v2.y) / 3,
    (tri.v0.z + tri.v1.z + tri.v2.z) / 3,
  );
}

/** Fast slab AABB test that returns true if the ray hits the box (any t). */
function rayHitsAabb(ray: Ray, box: Aabb): boolean {
  let tmin = -Infinity;
  let tmax = Infinity;
  const o = [ray.origin.x, ray.origin.y, ray.origin.z];
  const d = [ray.direction.x, ray.direction.y, ray.direction.z];
  const lo = [box.min.x, box.min.y, box.min.z];
  const hi = [box.max.x, box.max.y, box.max.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (o[i] < lo[i] || o[i] > hi[i]) return false;
    } else {
      const inv = 1 / d[i];
      let t1 = (lo[i] - o[i]) * inv;
      let t2 = (hi[i] - o[i]) * inv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return false;
    }
  }
  return tmax >= 0;
}

export class BVH {
  private nodes: BVHNode[] = [];
  private tris: BVHTriangle[];

  constructor(triangles: BVHTriangle[]) {
    this.tris = triangles.slice(); // we reorder in-place
    if (triangles.length > 0) {
      this.build(0, triangles.length);
    }
  }

  private build(start: number, end: number): number {
    const count = end - start;

    // compute bounds
    let aabb = triAabb(this.tris[start].tri);
    for (let i = start + 1; i < end; i++) {
      aabb = unionAabb(aabb, triAabb(this.tris[i].tri));
    }

    if (count <= MAX_LEAF) {
      const idx = this.nodes.length;
      this.nodes.push({ aabb, start, count, left: -1, right: -1 });
      return idx;
    }

    // find longest axis
    const extent = aabb.max.sub(aabb.min);
    let axis = 0;
    if (extent.y > extent.x) axis = 1;
    if (extent.z > (axis === 0 ? extent.x : extent.y)) axis = 2;

    // sort triangles by centroid along that axis
    const getAxis = (v: Vec3) => axis === 0 ? v.x : axis === 1 ? v.y : v.z;
    this.tris.slice(); // no-op, just for clarity
    const sub = this.tris.slice(start, end);
    sub.sort((a, b) => getAxis(centroid(a.tri)) - getAxis(centroid(b.tri)));
    for (let i = 0; i < sub.length; i++) this.tris[start + i] = sub[i];

    const mid = start + Math.floor(count / 2);

    // reserve a slot for this internal node
    const idx = this.nodes.length;
    this.nodes.push({ aabb, start: -1, count: 0, left: -1, right: -1 });

    const left = this.build(start, mid);
    const right = this.build(mid, end);

    this.nodes[idx].left = left;
    this.nodes[idx].right = right;

    return idx;
  }

  intersect(ray: Ray, maxT = Infinity): BVHHit | null {
    if (this.nodes.length === 0) return null;
    return this.traverse(ray, 0, maxT);
  }

  /** Independent packed copy for the browser's triangle ray tracer.
   * Three RGBA texels per node: min/start, max/count, left/right.
   * Triangle IDs refer to the caller's matIndex, preserving UV lookup after sorting.
   */
  toTextureData(): { nodes: Float32Array; triangleIds: number[] } {
    const nodes = new Float32Array(this.nodes.length * 12);
    this.nodes.forEach((n, i) => nodes.set([
      n.aabb.min.x, n.aabb.min.y, n.aabb.min.z, n.start,
      n.aabb.max.x, n.aabb.max.y, n.aabb.max.z, n.count,
      n.left, n.right, 0, 0,
    ], i * 12));
    return { nodes, triangleIds: this.tris.map((t) => t.matIndex) };
  }

  private traverse(ray: Ray, nodeIdx: number, maxT: number): BVHHit | null {
    const node = this.nodes[nodeIdx];
    if (!rayHitsAabb(ray, node.aabb)) return null;

    if (node.start >= 0) {
      // leaf
      let best: BVHHit | null = null;
      for (let i = node.start; i < node.start + node.count; i++) {
        const bt = this.tris[i];
        const hit = rayTriangle(ray, bt.tri);
        if (hit && hit.t < maxT) {
          maxT = hit.t;
          const point = ray.origin.add(ray.direction.scale(hit.t));
          const normal = this.smoothNormal(bt, hit);
          best = { t: hit.t, normal, point, matIndex: bt.matIndex };
        }
      }
      return best;
    }

    // internal: traverse both children, nearer first
    const hitL = this.traverse(ray, node.left, maxT);
    if (hitL) maxT = hitL.t;
    const hitR = this.traverse(ray, node.right, maxT);
    return hitR ?? hitL;
  }

  private smoothNormal(bt: BVHTriangle, hit: TriHit): Vec3 {
    if (bt.n0 && bt.n1 && bt.n2) {
      const w = 1 - hit.u - hit.v;
      return bt.n0.scale(w).add(bt.n1.scale(hit.u)).add(bt.n2.scale(hit.v)).normalize();
    }
    return bt.tri.normal;
  }
}
