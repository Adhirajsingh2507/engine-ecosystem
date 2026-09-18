import { Aabb } from "@engine/math";

/**
 * Uniform-grid spatial hash for broad-phase collision culling. Buckets each AABB
 * into every grid cell it touches, then emits the index pairs that share a cell.
 *
 * The result is a **superset** of the truly-overlapping pairs: any two AABBs that
 * overlap must share at least one cell (the overlap region sits in both), so there
 * are **no false negatives** — but a returned pair may only share a cell without
 * overlapping. Run `aabbAabb` (narrow-phase) on each candidate to confirm.
 *
 * ponytail: dense uniform grid — pick a cellSize near typical object size. A very
 * large object spanning many cells inflates work; swap for a BVH/loose grid if a
 * game has wildly varying sizes.
 */
export class SpatialHash {
  readonly cellSize: number;

  constructor(cellSize: number) {
    if (!(cellSize > 0)) throw new RangeError("cellSize must be > 0");
    this.cellSize = cellSize;
  }

  /** Candidate index pairs [i, j] (i < j) whose AABBs share ≥ 1 grid cell. */
  pairs(aabbs: readonly Aabb[]): [number, number][] {
    const cs = this.cellSize;
    const buckets = new Map<string, number[]>();

    for (let i = 0; i < aabbs.length; i++) {
      const a = aabbs[i];
      const x0 = Math.floor(a.min.x / cs), x1 = Math.floor(a.max.x / cs);
      const y0 = Math.floor(a.min.y / cs), y1 = Math.floor(a.max.y / cs);
      const z0 = Math.floor(a.min.z / cs), z1 = Math.floor(a.max.z / cs);
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          for (let z = z0; z <= z1; z++) {
            const key = `${x},${y},${z}`;
            const bucket = buckets.get(key);
            if (bucket) bucket.push(i);
            else buckets.set(key, [i]);
          }
        }
      }
    }

    const seen = new Set<string>();
    const out: [number, number][] = [];
    for (const idxs of buckets.values()) {
      // idxs is ascending (i pushed in increasing order) ⇒ m<n gives i<j
      for (let m = 0; m < idxs.length; m++) {
        for (let n = m + 1; n < idxs.length; n++) {
          const i = idxs[m];
          const j = idxs[n];
          const k = `${i},${j}`;
          if (!seen.has(k)) {
            seen.add(k);
            out.push([i, j]);
          }
        }
      }
    }
    return out;
  }
}
