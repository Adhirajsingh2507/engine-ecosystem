import { Transform } from "@engine/math";
import { FixedTimestep } from "@engine/core";
import { Registry, Scheduler, SceneNode, type System } from "@engine/ecs";

/**
 * The runtime integrator that ties the layers together: an ECS `Registry`, a
 * system `Scheduler`, a root scene-graph node, and a fixed-timestep clock. It is
 * backend-agnostic — rendering is a callback, so the same Engine drives a WebGL
 * client, a headless server sim, or a test.
 *
 * `frame(frameDt)` runs zero or more deterministic fixed sim steps (advancing the
 * scheduler), then one render callback with the interpolation `alpha`.
 */
export interface EngineOptions {
  /** Fixed simulation step in seconds (default 1/60). */
  fixedStep?: number;
  /** Max sim steps per frame — caps catch-up (default 5). */
  maxSteps?: number;
}

export type RenderFn = (world: Registry, alpha: number) => void;

export class Engine {
  readonly world = new Registry();
  readonly scene = new SceneNode(Transform.identity);
  readonly scheduler = new Scheduler();
  private readonly clock: FixedTimestep;
  private renderFn?: RenderFn;

  constructor(opts: EngineOptions = {}) {
    this.clock = new FixedTimestep(opts.fixedStep ?? 1 / 60, opts.maxSteps ?? 5);
  }

  /** The fixed sim step in seconds. */
  get step(): number {
    return this.clock.step;
  }

  /** Register a system, run each fixed step in insertion order. */
  addSystem(system: System): this {
    this.scheduler.add(system);
    return this;
  }

  /** Set the render callback, run once per frame after the sim steps. */
  onRender(fn: RenderFn): this {
    this.renderFn = fn;
    return this;
  }

  /** Advance one frame: fixed sim steps, then render with the leftover alpha. */
  frame(frameDt: number): number {
    const alpha = this.clock.run(frameDt, (step) => this.scheduler.update(this.world, step));
    this.renderFn?.(this.world, alpha);
    return alpha;
  }
}
