import { Vec3, Mat4 } from "@engine/math";
import { createProgram, createColorTarget, createDepthTarget, type ColorTarget } from "./gl.ts";
import * as S from "./shaders.ts";

export interface Instance {
  model: Mat4;
  albedo: Vec3;
  roughness: number;
  metalness: number;
}

export interface DirLight {
  dir: Vec3; // direction TO the light (normalized)
  color: Vec3; // radiance (may exceed 1 for HDR)
  viewProj: Mat4; // light-space matrix for shadows
}

export interface Frame {
  sphere: { vao: WebGLVertexArrayObject; count: number };
  floorVao: WebGLVertexArrayObject;
  instances: Instance[];
  camPos: Vec3;
  viewProj: Mat4;
  light: DirLight;
}

const SHADOW_SIZE = 2048;
const f32 = (m: Mat4) => new Float32Array(m.toArray());

/** A small forward+post graphics engine: shadow map → HDR PBR → bloom → ACES. */
export class Renderer {
  private gl: WebGL2RenderingContext;
  private hdrFloat: boolean;
  private shadow: ColorTarget;
  private hdr!: ColorTarget;
  private bloomA!: ColorTarget;
  private bloomB!: ColorTarget;
  private w = 1;
  private h = 1;
  private emptyVao: WebGLVertexArrayObject;

  private progDepth: WebGLProgram;
  private progScene: WebGLProgram;
  private progFloor: WebGLProgram;
  private progBright: WebGLProgram;
  private progBlur: WebGLProgram;
  private progComposite: WebGLProgram;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.hdrFloat = !!gl.getExtension("EXT_color_buffer_float");
    this.shadow = createDepthTarget(gl, SHADOW_SIZE);
    this.emptyVao = gl.createVertexArray()!;

    this.progDepth = createProgram(gl, S.depthVert, S.depthFrag);
    this.progScene = createProgram(gl, S.sceneVert, S.sceneFrag);
    this.progFloor = createProgram(gl, S.floorVert, S.floorFrag);
    this.progBright = createProgram(gl, S.postVert, S.brightFrag);
    this.progBlur = createProgram(gl, S.postVert, S.blurFrag);
    this.progComposite = createProgram(gl, S.postVert, S.compositeFrag);
    this.resize(1, 1);
  }

  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    const gl = this.gl;
    this.hdr = createColorTarget(gl, w, h, { float: this.hdrFloat, depth: true, linear: true });
    const bw = Math.max(1, w >> 1);
    const bh = Math.max(1, h >> 1);
    this.bloomA = createColorTarget(gl, bw, bh, { float: this.hdrFloat, linear: true });
    this.bloomB = createColorTarget(gl, bw, bh, { float: this.hdrFloat, linear: true });
  }

  render(frame: Frame): void {
    const gl = this.gl;
    const lightVP = f32(frame.light.viewProj);

    // --- 1. shadow depth from the light ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadow.fbo);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.progDepth);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.progDepth, "u_lightVP"), false, lightVP);
    const uDepthModel = gl.getUniformLocation(this.progDepth, "u_model");
    gl.bindVertexArray(frame.sphere.vao);
    for (const it of frame.instances) {
      gl.uniformMatrix4fv(uDepthModel, false, f32(it.model));
      gl.drawElements(gl.TRIANGLES, frame.sphere.count, gl.UNSIGNED_SHORT, 0);
    }

    // --- 2. lit scene into the HDR target ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hdr.fbo);
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(0.02, 0.025, 0.035, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shadow.tex);

    const vp = f32(frame.viewProj);
    const { dir, color } = frame.light;

    // floor
    gl.useProgram(this.progFloor);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.progFloor, "u_viewProj"), false, vp);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.progFloor, "u_lightVP"), false, lightVP);
    gl.uniform3f(gl.getUniformLocation(this.progFloor, "u_camPos"), frame.camPos.x, frame.camPos.y, frame.camPos.z);
    gl.uniform3f(gl.getUniformLocation(this.progFloor, "u_lightDir"), dir.x, dir.y, dir.z);
    gl.uniform3f(gl.getUniformLocation(this.progFloor, "u_lightColor"), color.x, color.y, color.z);
    gl.uniform1i(gl.getUniformLocation(this.progFloor, "u_shadowMap"), 0);
    gl.bindVertexArray(frame.floorVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // spheres
    gl.useProgram(this.progScene);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.progScene, "u_viewProj"), false, vp);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.progScene, "u_lightVP"), false, lightVP);
    gl.uniform3f(gl.getUniformLocation(this.progScene, "u_camPos"), frame.camPos.x, frame.camPos.y, frame.camPos.z);
    gl.uniform3f(gl.getUniformLocation(this.progScene, "u_lightDir"), dir.x, dir.y, dir.z);
    gl.uniform3f(gl.getUniformLocation(this.progScene, "u_lightColor"), color.x, color.y, color.z);
    gl.uniform1i(gl.getUniformLocation(this.progScene, "u_shadowMap"), 0);
    const uModel = gl.getUniformLocation(this.progScene, "u_model");
    const uAlbedo = gl.getUniformLocation(this.progScene, "u_albedo");
    const uRough = gl.getUniformLocation(this.progScene, "u_roughness");
    const uMetal = gl.getUniformLocation(this.progScene, "u_metalness");
    gl.bindVertexArray(frame.sphere.vao);
    for (const it of frame.instances) {
      gl.uniformMatrix4fv(uModel, false, f32(it.model));
      gl.uniform3f(uAlbedo, it.albedo.x, it.albedo.y, it.albedo.z);
      gl.uniform1f(uRough, it.roughness);
      gl.uniform1f(uMetal, it.metalness);
      gl.drawElements(gl.TRIANGLES, frame.sphere.count, gl.UNSIGNED_SHORT, 0);
    }

    // --- 3. bloom: bright pass + separable blur ---
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(this.emptyVao);
    const bw = this.bloomA.width, bh = this.bloomA.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
    gl.viewport(0, 0, bw, bh);
    gl.useProgram(this.progBright);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.hdr.tex);
    gl.uniform1i(gl.getUniformLocation(this.progBright, "u_scene"), 0);
    gl.uniform1f(gl.getUniformLocation(this.progBright, "u_threshold"), 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(this.progBlur);
    const uBlurTex = gl.getUniformLocation(this.progBlur, "u_tex");
    const uDir = gl.getUniformLocation(this.progBlur, "u_dir");
    for (let i = 0; i < 2; i++) {
      // horizontal A -> B
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomB.fbo);
      gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
      gl.uniform1i(uBlurTex, 0);
      gl.uniform2f(uDir, 1 / bw, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // vertical B -> A
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
      gl.bindTexture(gl.TEXTURE_2D, this.bloomB.tex);
      gl.uniform2f(uDir, 0, 1 / bh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // --- 4. composite to screen: HDR + bloom -> ACES -> gamma -> vignette ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.w, this.h);
    gl.useProgram(this.progComposite);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.hdr.tex);
    gl.uniform1i(gl.getUniformLocation(this.progComposite, "u_scene"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
    gl.uniform1i(gl.getUniformLocation(this.progComposite, "u_bloom"), 1);
    gl.uniform1f(gl.getUniformLocation(this.progComposite, "u_bloom_intensity"), 0.6);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
