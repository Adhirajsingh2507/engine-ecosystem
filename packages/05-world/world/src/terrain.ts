import { Vec3 } from "@engine/math";
import { clamp } from "@engine/core";
import type { MeshData, MeshVertex } from "@engine/geometry";
import { ValueNoise } from "./noise.ts";

/**
 * A regular grid of heights (row-major, `z * width + x`) with terrain analysis —
 * the TerraSight-style slope / roughness / traversability queries — plus a
 * heightmap → mesh path that feeds `@engine/geometry`'s TriMesh/renderers.
 *
 * `cellSize` is the world spacing between adjacent samples on the X/Z plane;
 * heights are the Y coordinate.
 */
export interface TerrainNoiseOptions {
  seed?: number;
  /** Horizontal frequency: larger = more, smaller features. */
  frequency?: number;
  /** Peak height. */
  amplitude?: number;
  octaves?: number;
}

export class Heightmap {
  readonly width: number;
  readonly depth: number;
  readonly cellSize: number;
  readonly heights: Float32Array;

  constructor(width: number, depth: number, cellSize = 1, heights?: Float32Array) {
    if (width < 2 || depth < 2) throw new RangeError("heightmap needs width,depth ≥ 2");
    this.width = width;
    this.depth = depth;
    this.cellSize = cellSize;
    this.heights = heights ?? new Float32Array(width * depth);
    if (this.heights.length !== width * depth) throw new RangeError("heights length mismatch");
  }

  /** Generate a heightmap from fractal noise. */
  static fromNoise(width: number, depth: number, cellSize = 1, opts: TerrainNoiseOptions = {}): Heightmap {
    const { seed = 1337, frequency = 0.05, amplitude = 10, octaves = 5 } = opts;
    const noise = new ValueNoise(seed);
    const heights = new Float32Array(width * depth);
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        heights[z * width + x] = noise.fbm2D(x * frequency, z * frequency, octaves) * amplitude;
      }
    }
    return new Heightmap(width, depth, cellSize, heights);
  }

  /** Height at integer grid coords (clamped to the edges). */
  height(x: number, z: number): number {
    const cx = clamp(x | 0, 0, this.width - 1);
    const cz = clamp(z | 0, 0, this.depth - 1);
    return this.heights[cz * this.width + cx];
  }

  /** Bilinearly-sampled height at continuous grid coords. */
  sampleBilinear(x: number, z: number): number {
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    const tx = x - x0;
    const tz = z - z0;
    const h00 = this.height(x0, z0);
    const h10 = this.height(x0 + 1, z0);
    const h01 = this.height(x0, z0 + 1);
    const h11 = this.height(x0 + 1, z0 + 1);
    const hx0 = h00 + (h10 - h00) * tx;
    const hx1 = h01 + (h11 - h01) * tx;
    return hx0 + (hx1 - hx0) * tz;
  }

  /** Surface normal at a grid cell via central differences (unit). */
  normalAt(x: number, z: number): Vec3 {
    const s = this.cellSize;
    const dhdx = (this.height(x + 1, z) - this.height(x - 1, z)) / (2 * s);
    const dhdz = (this.height(x, z + 1) - this.height(x, z - 1)) / (2 * s);
    // gradient (dh/dx, dh/dz) → normal (-dh/dx, 1, -dh/dz)
    return new Vec3(-dhdx, 1, -dhdz).normalize();
  }

  /** Slope angle from horizontal, in radians (0 = flat, π/2 = vertical). */
  slopeAt(x: number, z: number): number {
    return Math.acos(clamp(this.normalAt(x, z).y, -1, 1));
  }

  /** Local roughness: std-dev of heights in a (2r+1)² neighbourhood. */
  roughnessAt(x: number, z: number, radius = 1): number {
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const h = this.height(x + dx, z + dz);
        sum += h;
        sumSq += h * h;
        n++;
      }
    }
    const mean = sum / n;
    return Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  }

  /** Traversable if the slope is at or below `maxSlopeRadians`. */
  traversableAt(x: number, z: number, maxSlopeRadians: number): boolean {
    return this.slopeAt(x, z) <= maxSlopeRadians;
  }

  /** Build a renderable grid mesh (positions centred on the origin, +Y up). */
  toMesh(matIndex = 0): MeshData {
    const { width, depth, cellSize } = this;
    const vertices: MeshVertex[] = new Array(width * depth);
    const ox = ((width - 1) * cellSize) / 2;
    const oz = ((depth - 1) * cellSize) / 2;
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        vertices[z * width + x] = {
          position: new Vec3(x * cellSize - ox, this.height(x, z), z * cellSize - oz),
          normal: this.normalAt(x, z),
        };
      }
    }
    const indices: number[] = [];
    for (let z = 0; z < depth - 1; z++) {
      for (let x = 0; x < width - 1; x++) {
        const a = z * width + x;
        const b = a + width;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return { vertices, indices, matIndices: new Array(indices.length / 3).fill(matIndex) };
  }
}
