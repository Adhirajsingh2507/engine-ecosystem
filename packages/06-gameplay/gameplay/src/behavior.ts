/**
 * Functional behaviour trees. A node is a function of a blackboard `B` returning
 * a `Status`; composites (sequence/selector) and decorators (invert/repeat) are
 * higher-order functions. Tiny, allocation-free, and trivial to test.
 */
/** Behaviour-tree tick result. (const object + union — strip-only friendly, no enum.) */
export const Status = {
  Success: "success",
  Failure: "failure",
  Running: "running",
} as const;
export type Status = (typeof Status)[keyof typeof Status];

export type BehaviorNode<B> = (bb: B) => Status;

/** Leaf that runs arbitrary logic and reports a status. */
export const action = <B>(fn: (bb: B) => Status): BehaviorNode<B> => fn;

/** Leaf that maps a boolean predicate to Success/Failure. */
export const condition = <B>(pred: (bb: B) => boolean): BehaviorNode<B> =>
  (bb) => (pred(bb) ? Status.Success : Status.Failure);

/** Run children in order; stop at the first non-Success (AND semantics). */
export const sequence = <B>(...children: BehaviorNode<B>[]): BehaviorNode<B> =>
  (bb) => {
    for (const child of children) {
      const s = child(bb);
      if (s !== Status.Success) return s;
    }
    return Status.Success;
  };

/** Run children in order; stop at the first non-Failure (OR semantics). */
export const selector = <B>(...children: BehaviorNode<B>[]): BehaviorNode<B> =>
  (bb) => {
    for (const child of children) {
      const s = child(bb);
      if (s !== Status.Failure) return s;
    }
    return Status.Failure;
  };

/** Invert Success↔Failure (Running passes through). */
export const invert = <B>(child: BehaviorNode<B>): BehaviorNode<B> =>
  (bb) => {
    const s = child(bb);
    return s === Status.Success ? Status.Failure : s === Status.Failure ? Status.Success : s;
  };

/** Always report Success regardless of the child's result. */
export const succeed = <B>(child: BehaviorNode<B>): BehaviorNode<B> =>
  (bb) => {
    child(bb);
    return Status.Success;
  };
