// WebGL2 real-time forward renderer: PBR (Cook-Torrance) + PCF shadow maps +
// HDR bloom + ACES. Extracted from apps/client so any app can consume it.
export { Renderer } from "./renderer.ts";
export type { Instance, DirLight, Frame } from "./renderer.ts";
export { createProgram, createColorTarget, createDepthTarget } from "./gl.ts";
export type { ColorTarget } from "./gl.ts";
export { uvSphere } from "./sphere.ts";
export type { Mesh } from "./sphere.ts";
export * as shaders from "./shaders.ts";
