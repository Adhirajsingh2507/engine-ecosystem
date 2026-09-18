import { Ray, Sphere, Vec3, raySphere } from '@engine/math';
import { createProgram } from '../gl.ts';
import { loadEarth } from './model.ts';
import { vertex, fragment } from './shaders.ts';

export const EARTH_TAN_FOV = Math.tan(34 * Math.PI / 360);
export interface EarthFrame { distance: number; centerX: number; centerY: number; rotation: number }

/** Uses the same camera convention as the GPU ray generator, in CSS pixels. */
export function projectOrbit(point: Vec3, frame: EarthFrame, width: number, height: number) {
  const eye = new Vec3(0, 0, frame.distance), to = point.sub(eye);
  const hit = raySphere(new Ray(eye, to), new Sphere(new Vec3(0, 0, 0), 1));
  const depth = frame.distance - point.z;
  return { x: width*frame.centerX+point.x/depth/EARTH_TAN_FOV*height/2,
    y: height*frame.centerY-point.y/depth/EARTH_TAN_FOV*height/2,
    visible: depth > 0 && (hit === null || hit > to.length()-0.002) };
}

export async function createEarthRenderer(canvas: HTMLCanvasElement, signal: AbortSignal) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) throw new Error('Interactive Earth needs WebGL 2. You can still explore every satellite in the list.');
  const debugInfo=gl.getExtension('WEBGL_debug_renderer_info');
  const softwareRenderer=debugInfo?/swiftshader|llvmpipe|software/i.test(String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))):false;
  const model = await loadEarth('/models/nasa-earth/Earth_1_12756.glb', signal);
  const textures: WebGLTexture[] = [];
  let program: WebGLProgram | undefined;
  let vao: WebGLVertexArrayObject | null = null;
  try {
    program = createProgram(gl, vertex, fragment);
    gl.useProgram(program);
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const upload = (name: string, data: Float32Array | ImageBitmap, unit: number) => {
      const tex=gl.createTexture(); if(!tex) throw new Error('Earth texture allocation failed.');
      textures.push(tex); gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,tex);
      if(data instanceof Float32Array) {
        const rows=Math.ceil(data.length/4096), padded=new Float32Array(rows*4096); padded.set(data);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,1024,rows,0,gl.RGBA,gl.FLOAT,padded);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      } else {
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,data);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program!,name),unit);
    };
    upload('uNodes',model.nodes,0); upload('uTriangles',model.triangles,1); upload('uColor',model.color,2);upload('uNormal',model.normal,3);
    if(gl.getError()!==gl.NO_ERROR) throw new Error('This device could not allocate the Earth textures.');
    const uniforms = Object.fromEntries(['uResolution','uCenter','uDistance','uRotation','uTanFov'].map(n=>[n,gl.getUniformLocation(program!,n)]));
    let lastDrawnFrame: EarthFrame | undefined;
    let lastWidth=0,lastHeight=0,lastQuality=0;
    const uniformsMono=gl.getUniformLocation(program,'uMonochrome');
    return {
      triangleCount:model.triangleCount,
      softwareRenderer,
      initialQuality:softwareRenderer?.4:.85,
      draw(frame:EarthFrame, width:number,height:number, quality=1) {
        // Do not pay for a full screen of ray tracing when only orbit overlays move.
        if(lastDrawnFrame&&Math.abs(frame.distance-lastDrawnFrame.distance)<.0006&&Math.abs(frame.rotation-lastDrawnFrame.rotation)<.0001&&Math.abs(frame.centerX-lastDrawnFrame.centerX)<.0001&&Math.abs(frame.centerY-lastDrawnFrame.centerY)<.0001&&width===lastWidth&&height===lastHeight&&quality===lastQuality)return false;
        const scale=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(760000/(width*height)))*quality;
        const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h); gl.useProgram(program!); gl.bindVertexArray(vao);
        gl.uniform2f(uniforms.uResolution,w,h);gl.uniform2f(uniforms.uCenter,frame.centerX,1-frame.centerY);
        gl.uniform1f(uniforms.uDistance,frame.distance);gl.uniform1f(uniforms.uRotation,frame.rotation);gl.uniform1f(uniforms.uTanFov,EARTH_TAN_FOV);
        gl.uniform1f(uniformsMono,Math.max(0,Math.min(1,(frame.distance-3.5)/2)));
        gl.drawArrays(gl.TRIANGLES,0,3);
        lastDrawnFrame={...frame};lastWidth=width;lastHeight=height;lastQuality=quality;
        return true;
      },
      dispose(){textures.forEach(t=>gl.deleteTexture(t));gl.deleteProgram(program!);gl.deleteVertexArray(vao);},
    };
  } catch(error) {
    textures.forEach(t=>gl.deleteTexture(t));if(program)gl.deleteProgram(program);if(vao)gl.deleteVertexArray(vao);throw error;
  } finally {model.color.close();model.normal.close();}
}
