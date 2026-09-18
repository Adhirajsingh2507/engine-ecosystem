// ---- shadow depth pass (spheres + floor share this) ----
export const depthVert = `#version 300 es
layout(location=0) in vec3 a_position;
uniform mat4 u_lightVP;
uniform mat4 u_model;
void main() { gl_Position = u_lightVP * u_model * vec4(a_position, 1.0); }`;

export const depthFrag = `#version 300 es
precision mediump float;
void main() {}`;

// shared PCF shadow lookup, prepended to the lit fragment shaders
const SHADOW_GLSL = `
uniform sampler2D u_shadowMap;
float shadow(vec4 lp, float ndl) {
  vec3 p = lp.xyz / lp.w * 0.5 + 0.5;
  if (p.z > 1.0) return 1.0;
  float bias = max(0.0025 * (1.0 - ndl), 0.0008);
  vec2 texel = 1.0 / vec2(textureSize(u_shadowMap, 0));
  float sh = 0.0;
  for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++) {
      float d = texture(u_shadowMap, p.xy + vec2(float(x), float(y)) * texel).r;
      sh += (p.z - bias > d) ? 0.0 : 1.0;
    }
  return sh / 9.0;
}
vec3 hemi(vec3 n) { // sky/ground ambient
  return mix(vec3(0.20, 0.19, 0.17), vec3(0.55, 0.65, 0.82), 0.5 + 0.5 * n.y);
}`;

// ---- lit spheres: Cook-Torrance PBR into an HDR target ----
export const sceneVert = `#version 300 es
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
uniform mat4 u_viewProj;
uniform mat4 u_model;
uniform mat4 u_lightVP;
out vec3 v_normal;
out vec3 v_world;
out vec4 v_lightPos;
void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  v_world = world.xyz;
  v_normal = mat3(u_model) * a_normal;
  v_lightPos = u_lightVP * world;
  gl_Position = u_viewProj * world;
}`;

export const sceneFrag = `#version 300 es
precision highp float;
in vec3 v_normal;
in vec3 v_world;
in vec4 v_lightPos;
uniform vec3 u_camPos;
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform vec3 u_albedo;
uniform float u_roughness;
uniform float u_metalness;
out vec4 outColor;
const float PI = 3.14159265359;
${SHADOW_GLSL}
float D_GGX(float ndh, float a) { float a2 = a * a; float d = ndh * ndh * (a2 - 1.0) + 1.0; return a2 / (PI * d * d); }
float G_Smith(float ndv, float ndl, float a) { float k = a * a * 0.5; float gv = ndv / (ndv * (1.0 - k) + k); float gl = ndl / (ndl * (1.0 - k) + k); return gv * gl; }
vec3 F_Schlick(float vdh, vec3 f0) { return f0 + (1.0 - f0) * pow(1.0 - vdh, 5.0); }
void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_camPos - v_world);
  vec3 L = normalize(u_lightDir);
  vec3 H = normalize(V + L);
  float ndl = max(dot(N, L), 0.0);
  float ndv = max(dot(N, V), 1e-4);
  float ndh = max(dot(N, H), 0.0);
  float vdh = max(dot(V, H), 0.0);
  float a = max(u_roughness * u_roughness, 0.002);
  vec3 f0 = mix(vec3(0.04), u_albedo, u_metalness);
  vec3 F = F_Schlick(vdh, f0);
  float D = D_GGX(ndh, a);
  float G = G_Smith(ndv, ndl, a);
  vec3 spec = (D * G) * F / max(4.0 * ndv * ndl, 1e-4);
  vec3 kd = (1.0 - F) * (1.0 - u_metalness);
  vec3 diffuse = kd * u_albedo / PI;
  float sh = shadow(v_lightPos, ndl);
  vec3 direct = (diffuse + spec) * u_lightColor * ndl * sh;
  vec3 R = reflect(-V, N);
  vec3 ambient = hemi(N) * u_albedo * (1.0 - u_metalness) * 0.4
               + hemi(R) * f0 * u_metalness * 0.6;
  outColor = vec4(direct + ambient, 1.0);
}`;

// ---- floor: procedural grid, lit + shadowed ----
export const floorVert = `#version 300 es
layout(location=0) in vec3 a_position;
uniform mat4 u_viewProj;
uniform mat4 u_lightVP;
out vec3 v_world;
out vec4 v_lightPos;
void main() {
  v_world = a_position;
  v_lightPos = u_lightVP * vec4(a_position, 1.0);
  gl_Position = u_viewProj * vec4(a_position, 1.0);
}`;

export const floorFrag = `#version 300 es
precision highp float;
in vec3 v_world;
in vec4 v_lightPos;
uniform vec3 u_camPos;
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
out vec4 outColor;
${SHADOW_GLSL}
void main() {
  vec3 N = vec3(0.0, 1.0, 0.0);
  vec3 L = normalize(u_lightDir);
  float ndl = max(dot(N, L), 0.0);
  // anti-aliased grid lines
  vec2 g = abs(fract(v_world.xz) - 0.5) / fwidth(v_world.xz);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  vec3 albedo = mix(vec3(0.10, 0.11, 0.13), vec3(0.32, 0.36, 0.44), line);
  float sh = shadow(v_lightPos, ndl);
  vec3 direct = albedo * u_lightColor * ndl * sh * 0.9;
  vec3 ambient = hemi(N) * albedo * 0.5;
  float fade = smoothstep(70.0, 20.0, length(v_world.xz - u_camPos.xz));
  outColor = vec4((direct + ambient) * fade, 1.0);
}`;

// ---- fullscreen post passes ----
export const postVert = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const brightFrag = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform float u_threshold;
out vec4 outColor;
void main() {
  vec3 c = texture(u_scene, v_uv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = max(luma - u_threshold, 0.0) / max(luma, 1e-4);
  outColor = vec4(c * k, 1.0);
}`;

export const blurFrag = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_dir; // texel-sized step along blur axis
out vec4 outColor;
void main() {
  float w[5]; w[0]=0.227027; w[1]=0.194595; w[2]=0.121622; w[3]=0.054054; w[4]=0.016216;
  vec3 sum = texture(u_tex, v_uv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    sum += texture(u_tex, v_uv + u_dir * float(i)).rgb * w[i];
    sum += texture(u_tex, v_uv - u_dir * float(i)).rgb * w[i];
  }
  outColor = vec4(sum, 1.0);
}`;

export const compositeFrag = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_bloom_intensity;
out vec4 outColor;
vec3 aces(vec3 x) {
  float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
void main() {
  vec3 hdr = texture(u_scene, v_uv).rgb + texture(u_bloom, v_uv).rgb * u_bloom_intensity;
  vec3 mapped = aces(hdr);
  mapped = pow(mapped, vec3(1.0 / 2.2)); // gamma
  float d = distance(v_uv, vec2(0.5));
  mapped *= smoothstep(0.9, 0.35, d) * 0.35 + 0.65; // vignette
  outColor = vec4(mapped, 1.0);
}`;
