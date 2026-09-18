/**
 * Time systems for astronomy. Julian Date and Greenwich Mean Sidereal Time — the
 * bridge between civil UTC and the inertial frames orbital mechanics works in.
 */

/** Julian Date of J2000.0 epoch (2000-01-01 12:00 UTC). */
export const J2000 = 2451545.0;

/** Julian Date for a JS Date (which is UTC-based). */
export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Days elapsed since J2000.0. */
export function daysSinceJ2000(date: Date): number {
  return julianDate(date) - J2000;
}

/**
 * Greenwich Mean Sidereal Time in radians, in [0, 2π). Low-precision formula
 * (good to a few arcseconds), sufficient for rendering/visualisation.
 */
export function gmstRadians(date: Date): number {
  const d = daysSinceJ2000(date);
  // GMST in hours (IAU 1982 low-precision)
  const hours = (18.697374558 + 24.06570982441908 * d) % 24;
  const wrapped = ((hours % 24) + 24) % 24;
  return (wrapped / 24) * 2 * Math.PI;
}
