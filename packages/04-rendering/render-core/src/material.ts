import { type Color, rgb } from "./color.ts";

/**
 * Metalness/roughness PBR material — the standard model the WebGL2 backend's
 * Cook-Torrance shader (and any future WebGPU backend) consumes. Colours are
 * linear.
 */
export interface StandardMaterial {
  albedo: Color;
  /** 0 = dielectric, 1 = metal */
  metalness: number;
  /** 0 = mirror-smooth, 1 = fully rough */
  roughness: number;
  emissive: Color;
}

/** A StandardMaterial with sensible defaults, overridable field-by-field. */
export function standardMaterial(overrides: Partial<StandardMaterial> = {}): StandardMaterial {
  return {
    albedo: overrides.albedo ?? rgb(0.8, 0.8, 0.8),
    metalness: overrides.metalness ?? 0,
    roughness: overrides.roughness ?? 0.5,
    emissive: overrides.emissive ?? rgb(0, 0, 0),
  };
}

/**
 * Base reflectance F0: dielectrics reflect a flat ~4%, metals reflect their
 * albedo. This is the `mix(0.04, albedo, metalness)` every PBR shader needs.
 */
export function f0(m: StandardMaterial): Color {
  const dielectric = 0.04;
  const t = m.metalness;
  return {
    r: dielectric + (m.albedo.r - dielectric) * t,
    g: dielectric + (m.albedo.g - dielectric) * t,
    b: dielectric + (m.albedo.b - dielectric) * t,
    a: 1,
  };
}
