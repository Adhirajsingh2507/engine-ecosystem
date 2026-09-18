/**
 * A render graph: named passes that read and write named resources. `compile()`
 * returns the passes in dependency order (a pass runs after every pass that writes
 * a resource it reads), via Kahn's topological sort — throwing on a cycle. This is
 * pure scheduling logic (no GPU), so it's fully testable; a backend then executes
 * the compiled order.
 */
export interface RenderPass {
  name: string;
  /** resources this pass samples/consumes */
  reads?: string[];
  /** resources this pass produces */
  writes?: string[];
  /** backend work; optional so the graph can be compiled and inspected without a device */
  execute?: () => void;
}

export interface ResourceLifetime {
  /** index in the compiled order where the resource is first written */
  first: number;
  /** index where it is last read (or written) */
  last: number;
}

export class RenderGraph {
  private readonly passes: RenderPass[] = [];

  addPass(pass: RenderPass): this {
    if (this.passes.some((p) => p.name === pass.name)) {
      throw new Error(`duplicate pass name: ${pass.name}`);
    }
    this.passes.push(pass);
    return this;
  }

  /** Passes in dependency order. Independent passes keep their insertion order. */
  compile(): RenderPass[] {
    const n = this.passes.length;
    // producers[resource] = indices of passes that write it
    const producers = new Map<string, number[]>();
    this.passes.forEach((p, i) => {
      for (const w of p.writes ?? []) {
        const list = producers.get(w) ?? [];
        list.push(i);
        producers.set(w, list);
      }
    });

    // edge a → b when b reads a resource a writes
    const indegree = new Array(n).fill(0);
    const edges: number[][] = Array.from({ length: n }, () => []);
    this.passes.forEach((p, b) => {
      const deps = new Set<number>();
      for (const r of p.reads ?? []) {
        for (const a of producers.get(r) ?? []) if (a !== b) deps.add(a);
      }
      for (const a of deps) {
        edges[a].push(b);
        indegree[b]++;
      }
    });

    // Kahn's algorithm; ready queue kept in insertion order for stable output
    const ready: number[] = [];
    for (let i = 0; i < n; i++) if (indegree[i] === 0) ready.push(i);
    const order: RenderPass[] = [];
    while (ready.length > 0) {
      const i = ready.shift()!;
      order.push(this.passes[i]);
      for (const j of edges[i]) {
        if (--indegree[j] === 0) {
          // insert keeping ascending index order → stable
          let k = ready.length;
          while (k > 0 && ready[k - 1] > j) k--;
          ready.splice(k, 0, j);
        }
      }
    }
    if (order.length !== n) throw new Error("render graph has a cycle");
    return order;
  }

  /** First-write → last-use index per resource in the compiled order (for aliasing). */
  resourceLifetimes(order: RenderPass[] = this.compile()): Map<string, ResourceLifetime> {
    const life = new Map<string, ResourceLifetime>();
    order.forEach((p, i) => {
      for (const res of [...(p.writes ?? []), ...(p.reads ?? [])]) {
        const l = life.get(res);
        if (!l) life.set(res, { first: i, last: i });
        else l.last = i;
      }
    });
    return life;
  }
}
