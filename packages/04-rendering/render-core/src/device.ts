import type { Mat4 } from "@engine/math";
import type { Color } from "./color.ts";

/**
 * The backend seam. A concrete backend (`@engine/render-webgl2` today, a WebGPU
 * backend later) implements `RenderDevice`; the rest of the engine talks only to
 * this interface. These are types only — no runtime code lives here — so the
 * abstraction adds no cost and nothing to unit-test; the backends themselves are
 * verified in a browser.
 */
export type TextureFormat = "rgba8" | "rgba16f" | "depth24";

export interface RenderTargetDesc {
  width: number;
  height: number;
  format: TextureFormat;
}

export interface RenderTarget {
  readonly width: number;
  readonly height: number;
  readonly format: TextureFormat;
}

export interface Camera {
  viewProj: Mat4;
  /** eye position, for view-dependent shading */
  position: { x: number; y: number; z: number };
}

export interface RenderDevice {
  readonly backend: string;
  createTarget(desc: RenderTargetDesc): RenderTarget;
  /** clear a target to a colour (and depth if it has one) */
  clear(target: RenderTarget | null, color: Color): void;
  /** present the default framebuffer for the frame */
  present(): void;
  /** release GPU resources */
  dispose(): void;
}
