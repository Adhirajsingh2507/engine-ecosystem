/**
 * A tiny archetype-free ECS. Entities are integer ids; components live in
 * per-type sparse maps (entity → value). This is the "sparse set of Maps"
 * design — trivial to reason about and fast enough for thousands of entities.
 *
 * ponytail: Map-per-component, linear query over the smallest store. If a game
 * pushes 10⁵+ entities or hot per-frame queries, swap the stores for typed
 * archetypes; the public API here won't have to change.
 */

export type Entity = number;

/** A typed handle for a component kind. Create one with `defineComponent`. */
export interface ComponentType<T> {
  readonly id: number;
  readonly name: string;
  /** phantom — carries the value type, never assigned at runtime */
  readonly __t?: T;
}

let nextComponentId = 0;

/** Declare a component kind. The `T` is the shape of the stored value. */
export function defineComponent<T>(name: string): ComponentType<T> {
  return { id: nextComponentId++, name };
}

export class Registry {
  private nextEntity: Entity = 1;
  private living = new Set<Entity>();
  private stores = new Map<number, Map<Entity, unknown>>();

  /** Create and return a fresh live entity. */
  create(): Entity {
    const e = this.nextEntity++;
    this.living.add(e);
    return e;
  }

  /** Remove an entity and all of its components. */
  destroy(e: Entity): void {
    this.living.delete(e);
    for (const store of this.stores.values()) store.delete(e);
  }

  alive(e: Entity): boolean {
    return this.living.has(e);
  }

  add<T>(e: Entity, type: ComponentType<T>, value: T): this {
    this.storeOf(type).set(e, value);
    return this;
  }

  get<T>(e: Entity, type: ComponentType<T>): T | undefined {
    return this.storeOf(type).get(e) as T | undefined;
  }

  has<T>(e: Entity, type: ComponentType<T>): boolean {
    return this.storeOf(type).has(e);
  }

  remove<T>(e: Entity, type: ComponentType<T>): void {
    this.storeOf(type).delete(e);
  }

  /** Number of entities carrying a component. */
  count<T>(type: ComponentType<T>): number {
    return this.storeOf(type).size;
  }

  /**
   * Iterate `[entity, ...components]` for every live entity that has all the
   * given component types. Iterates the smallest store and probes the rest.
   */
  *query<T extends unknown[]>(
    ...types: { [K in keyof T]: ComponentType<T[K]> }
  ): IterableIterator<[Entity, ...T]> {
    if (types.length === 0) return;
    const stores = types.map((t) => this.storeOf(t));
    // drive iteration from the smallest store to minimise probes
    let pivot = 0;
    for (let i = 1; i < stores.length; i++) {
      if (stores[i].size < stores[pivot].size) pivot = i;
    }
    outer: for (const e of stores[pivot].keys()) {
      const row = new Array(types.length + 1);
      row[0] = e;
      for (let i = 0; i < stores.length; i++) {
        if (!stores[i].has(e)) continue outer;
        row[i + 1] = stores[i].get(e);
      }
      yield row as [Entity, ...T];
    }
  }

  private storeOf<T>(type: ComponentType<T>): Map<Entity, unknown> {
    let store = this.stores.get(type.id);
    if (!store) {
      store = new Map();
      this.stores.set(type.id, store);
    }
    return store;
  }
}
