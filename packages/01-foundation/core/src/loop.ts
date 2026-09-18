/**
 * Fixed-timestep accumulator — "Fix Your Timestep" (Gaffer on Games). Feed it a
 * variable frame delta; it tells you how many fixed-size sim steps to run and an
 * `alpha` in [0,1) for interpolating rendering between the last two states.
 *
 * Determinism: the physics/sim advances in constant `step` increments regardless
 * of frame rate. `maxSteps` caps catch-up so a long stall can't trigger a "spiral
 * of death" — leftover backlog beyond the cap is dropped.
 */
export class FixedTimestep {
  readonly step: number;
  readonly maxSteps: number;
  private accumulator = 0;

  constructor(step = 1 / 60, maxSteps = 5) {
    if (!(step > 0)) throw new RangeError("step must be > 0");
    if (!(maxSteps >= 1)) throw new RangeError("maxSteps must be ≥ 1");
    this.step = step;
    this.maxSteps = maxSteps;
  }

  /**
   * Absorb a frame delta (seconds). Returns the number of fixed steps to run and
   * the render interpolation factor.
   */
  advance(frameDt: number): { steps: number; alpha: number } {
    this.accumulator += frameDt;
    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSteps) {
      this.accumulator -= this.step;
      steps++;
    }
    if (steps === this.maxSteps && this.accumulator > this.step) {
      this.accumulator = 0; // fell behind the cap — drop the backlog
    }
    return { steps, alpha: this.accumulator / this.step };
  }

  /** Convenience: run `fn(step)` for each fixed step this frame; returns alpha. */
  run(frameDt: number, fn: (step: number) => void): number {
    const { steps, alpha } = this.advance(frameDt);
    for (let i = 0; i < steps; i++) fn(this.step);
    return alpha;
  }

  /** Discard any partial-step time (e.g. after a pause). */
  reset(): void {
    this.accumulator = 0;
  }
}
