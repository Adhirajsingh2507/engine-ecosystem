import { Vec3 } from "@engine/math";

/**
 * Two-body (Keplerian) orbital mechanics. Propagates classical orbital elements
 * to a Cartesian state (position + velocity) in the inertial frame at time `t`,
 * by solving Kepler's equation for the eccentric anomaly (Newton–Raphson).
 *
 * SI units: metres, seconds. Angles in radians. `mu` is the gravitational
 * parameter GM (default: Earth). This is the CPU-side companion to the Rust
 * `crates/num-rs`; the orbital collision-probability code stays in orbit-trust.
 */

/** Earth gravitational parameter GM (m³/s²). */
export const MU_EARTH = 3.986004418e14;

export interface OrbitalElements {
  /** semi-major axis (m) */
  a: number;
  /** eccentricity (0 = circular, <1 = elliptical) */
  e: number;
  /** inclination (rad) */
  i: number;
  /** right ascension of ascending node Ω (rad) */
  raan: number;
  /** argument of periapsis ω (rad) */
  argp: number;
  /** mean anomaly at epoch M₀ (rad) */
  M0: number;
  /** gravitational parameter GM; defaults to Earth */
  mu?: number;
}

export interface State {
  position: Vec3;
  velocity: Vec3;
}

/** Solve M = E − e·sin E for the eccentric anomaly E (Newton–Raphson). */
export function solveKepler(M: number, e: number, tol = 1e-12): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 100; k++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}

/** Orbital period (s) for a semi-major axis `a`. */
export function period(a: number, mu = MU_EARTH): number {
  return 2 * Math.PI * Math.sqrt((a * a * a) / mu);
}

// perifocal → inertial: Rz(Ω) · Rx(i) · Rz(ω)
function rotZ(v: Vec3, ang: number): Vec3 {
  const c = Math.cos(ang), s = Math.sin(ang);
  return new Vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
}
function rotX(v: Vec3, ang: number): Vec3 {
  const c = Math.cos(ang), s = Math.sin(ang);
  return new Vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z);
}
function perifocalToInertial(v: Vec3, el: OrbitalElements): Vec3 {
  return rotZ(rotX(rotZ(v, el.argp), el.i), el.raan);
}

/** Propagate elements to a Cartesian state at time `t` seconds after epoch. */
export function propagate(el: OrbitalElements, t: number): State {
  const mu = el.mu ?? MU_EARTH;
  const { a, e } = el;
  const n = Math.sqrt(mu / (a * a * a)); // mean motion
  const M = el.M0 + n * t;
  const E = solveKepler(M, e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);

  const nu = Math.atan2(Math.sqrt(1 - e * e) * sinE, cosE - e); // true anomaly
  const r = a * (1 - e * cosE);
  const p = a * (1 - e * e);
  const vf = Math.sqrt(mu / p);

  const rPeri = new Vec3(r * Math.cos(nu), r * Math.sin(nu), 0);
  const vPeri = new Vec3(-vf * Math.sin(nu), vf * (e + Math.cos(nu)), 0);
  return { position: perifocalToInertial(rPeri, el), velocity: perifocalToInertial(vPeri, el) };
}

/** Specific orbital energy v²/2 − μ/r (constant on an orbit; = −μ/2a). */
export function specificEnergy(state: State, mu = MU_EARTH): number {
  return state.velocity.lengthSq() / 2 - mu / state.position.length();
}
