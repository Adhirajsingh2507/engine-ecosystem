/**
 * Generic 4th-order Runge–Kutta integrator. Works on any state type given `add`
 * and `scale` operators, so it integrates scalars, vectors, or full state structs
 * with the same code. Far more accurate than Euler for smooth ODEs.
 */
export interface StateOps<S> {
  add: (a: S, b: S) => S;
  scale: (s: S, k: number) => S;
}

/**
 * Advance `state` by `dt` under `deriv(state, t)` using RK4.
 * @param deriv time-derivative of the state
 * @param ops   how to add two states and scale a state by a scalar
 */
export function rk4<S>(
  state: S,
  t: number,
  dt: number,
  deriv: (s: S, t: number) => S,
  ops: StateOps<S>,
): S {
  const { add, scale } = ops;
  const k1 = deriv(state, t);
  const k2 = deriv(add(state, scale(k1, dt / 2)), t + dt / 2);
  const k3 = deriv(add(state, scale(k2, dt / 2)), t + dt / 2);
  const k4 = deriv(add(state, scale(k3, dt)), t + dt);
  const weighted = add(add(k1, scale(k2, 2)), add(scale(k3, 2), k4));
  return add(state, scale(weighted, dt / 6));
}

/** Scalar `add`/`scale` ops, for convenience. */
export const scalarOps: StateOps<number> = {
  add: (a, b) => a + b,
  scale: (s, k) => s * k,
};
