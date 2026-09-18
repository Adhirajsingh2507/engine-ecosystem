import { mulberry32, lerp } from "@engine/core";

/** Quintic fade (Perlin's 6t⁵−15t⁴+10t³) for smooth C² interpolation. */
const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Seeded value noise + fractal Brownian motion. Deterministic for a given seed
 * (a shuffled permutation table drives lattice values), so terrain/world content
 * is reproducible. Outputs are in [0, 1].
 *
 * ponytail: value noise (cheap, smooth). Swap for gradient/simplex noise if you
 * need fewer axis-aligned artefacts at low frequencies.
 */
export class ValueNoise {
  private readonly perm: Uint8Array; // 512-entry doubled permutation

  constructor(seed = 1337) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    const rnd = mulberry32(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  /** Pseudo-random lattice value in [0, 1] at integer (x, y). */
  private lattice(x: number, y: number): number {
    return this.perm[(this.perm[x & 255] + y) & 255] / 255;
  }

  /** 2D value noise in [0, 1]. */
  noise2D(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const nx0 = lerp(this.lattice(xi, yi), this.lattice(xi + 1, yi), u);
    const nx1 = lerp(this.lattice(xi, yi + 1), this.lattice(xi + 1, yi + 1), u);
    return lerp(nx0, nx1, v);
  }

  /**
   * Fractal Brownian motion: sum of `octaves` noise layers at rising frequency
   * (× lacunarity) and falling amplitude (× gain). Normalised to [0, 1].
   */
  fbm2D(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
    let amp = 0.5;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.noise2D(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }
}
