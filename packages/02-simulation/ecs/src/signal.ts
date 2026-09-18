/**
 * A typed one-channel event. `add` returns an unsubscribe function. Emitting
 * snapshots the handler set first, so a handler may subscribe/unsubscribe during
 * dispatch without disturbing the current emit.
 */
export class Signal<T> {
  private handlers = new Set<(payload: T) => void>();

  add(handler: (payload: T) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(payload: T): void {
    for (const h of [...this.handlers]) h(payload);
  }

  clear(): void {
    this.handlers.clear();
  }

  get size(): number {
    return this.handlers.size;
  }
}
