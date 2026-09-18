import type { Registry } from "./registry.ts";

/** A system is just a function run each tick against the registry. */
export type System = (world: Registry, dt: number) => void;

/** Runs registered systems in insertion order once per `update`. */
export class Scheduler {
  private systems: System[] = [];

  add(system: System): this {
    this.systems.push(system);
    return this;
  }

  update(world: Registry, dt: number): void {
    for (const system of this.systems) system(world, dt);
  }
}
