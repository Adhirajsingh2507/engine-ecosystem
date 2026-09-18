import { Vec3 } from "@engine/math";
import { Aabb } from "@engine/geometry";

/**
 * Immediate-mode debug geometry collector. Gameplay/physics code pushes lines,
 * boxes and crosses each frame; a renderer consumes `vertexData()` (interleaved
 * position+colour) and draws them as GL_LINES. Pure data — no GPU here, so it's
 * headless-testable; the actual draw call lives in the renderer/app.
 */
export interface DebugLine {
  a: Vec3;
  b: Vec3;
  color: Vec3;
}

const WHITE = new Vec3(1, 1, 1);

export class DebugDraw {
  readonly lines: DebugLine[] = [];

  clear(): void {
    this.lines.length = 0;
  }

  line(a: Vec3, b: Vec3, color: Vec3 = WHITE): this {
    this.lines.push({ a, b, color });
    return this;
  }

  /** A 3-axis cross at `p` (size = half-length of each arm). */
  cross(p: Vec3, size = 0.1, color: Vec3 = WHITE): this {
    this.line(p.sub(new Vec3(size, 0, 0)), p.add(new Vec3(size, 0, 0)), color);
    this.line(p.sub(new Vec3(0, size, 0)), p.add(new Vec3(0, size, 0)), color);
    this.line(p.sub(new Vec3(0, 0, size)), p.add(new Vec3(0, 0, size)), color);
    return this;
  }

  /** The 12 edges of an AABB. */
  box(box: Aabb, color: Vec3 = WHITE): this {
    const { min, max } = box;
    const c = [
      new Vec3(min.x, min.y, min.z), new Vec3(max.x, min.y, min.z),
      new Vec3(max.x, max.y, min.z), new Vec3(min.x, max.y, min.z),
      new Vec3(min.x, min.y, max.z), new Vec3(max.x, min.y, max.z),
      new Vec3(max.x, max.y, max.z), new Vec3(min.x, max.y, max.z),
    ];
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // bottom face (−z)
      [4, 5], [5, 6], [6, 7], [7, 4], // top face (+z)
      [0, 4], [1, 5], [2, 6], [3, 7], // verticals
    ];
    for (const [i, j] of edges) this.line(c[i], c[j], color);
    return this;
  }

  /** Interleaved [x,y,z, r,g,b] per endpoint — 2 endpoints per line. */
  vertexData(): Float32Array {
    const out = new Float32Array(this.lines.length * 12);
    let o = 0;
    for (const { a, b, color } of this.lines) {
      out[o++] = a.x; out[o++] = a.y; out[o++] = a.z; out[o++] = color.x; out[o++] = color.y; out[o++] = color.z;
      out[o++] = b.x; out[o++] = b.y; out[o++] = b.z; out[o++] = color.x; out[o++] = color.y; out[o++] = color.z;
    }
    return out;
  }
}
