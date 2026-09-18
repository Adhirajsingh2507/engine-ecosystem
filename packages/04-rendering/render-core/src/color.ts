/**
 * Linear-space RGBA colour and sRGB conversion. Lighting math must happen in
 * linear space; textures/UI colours are usually authored in sRGB. Keep colours
 * linear in the engine and convert at the boundaries.
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const rgb = (r: number, g: number, b: number, a = 1): Color => ({ r, g, b, a });

export const BLACK: Color = rgb(0, 0, 0);
export const WHITE: Color = rgb(1, 1, 1);

/** sRGB → linear for one channel (IEC 61966-2-1). */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** linear → sRGB for one channel. */
export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Convert an sRGB colour to linear (alpha is left unchanged). */
export function colorToLinear(c: Color): Color {
  return { r: srgbToLinear(c.r), g: srgbToLinear(c.g), b: srgbToLinear(c.b), a: c.a };
}

/** Convert a linear colour to sRGB (alpha unchanged). */
export function colorToSrgb(c: Color): Color {
  return { r: linearToSrgb(c.r), g: linearToSrgb(c.g), b: linearToSrgb(c.b), a: c.a };
}

/** Rec. 709 relative luminance of a linear colour. */
export function luminance(c: Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}
