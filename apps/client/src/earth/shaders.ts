export const vertex = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Primary rays intersect the NASA triangles using the engine's packed BVH.
// Direct sun + normal-mapped surface + atmospheric shell. No claim of full GI.
export const fragment = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uNodes, uTriangles, uColor, uNormal;
uniform vec2 uResolution, uCenter;
uniform float uDistance, uRotation, uTanFov;
uniform float uMonochrome;
out vec4 outColor;
vec4 dataAt(sampler2D tex, int index) { return texelFetch(tex, ivec2(index % 1024, index / 1024), 0); }
vec2 sphere(vec3 ro, vec3 rd, float radius) {
  float b = dot(ro, rd), c = dot(ro, ro) - radius * radius, d = b*b-c;
  if (d < 0.0) return vec2(-1.0);
  return vec2(-b-sqrt(d), -b+sqrt(d));
}
bool boxHit(vec3 ro, vec3 inv, vec3 lo, vec3 hi, float limit) {
  vec3 a=(lo-ro)*inv, b=(hi-ro)*inv;
  vec3 nearT=min(a,b), farT=max(a,b);
  return max(max(nearT.x,nearT.y),max(nearT.z,0.0)) <= min(min(farT.x,farT.y),min(farT.z,limit));
}
vec3 rotateY(vec3 p, float a) { float c=cos(a),s=sin(a); return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z); }
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 aces(vec3 x) { return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec2 uv = (pixel / uResolution - uCenter) * 2.0;
  uv.x *= uResolution.x/uResolution.y;
  vec3 ro = rotateY(vec3(0.0,0.0,uDistance),-uRotation);
  vec3 rd = rotateY(normalize(vec3(uv*uTanFov,-1.0)),-uRotation);
  vec3 sun = rotateY(normalize(vec3(-0.6,0.65,1.2)),-uRotation);
  vec2 cell=floor(pixel/3.0);
  float star=step(0.9975,hash(cell))*pow(max(0.0,1.0-length(fract(pixel/3.0)-0.5)*2.0),3.0);
  vec3 color=vec3(0.0013,0.0024,0.0045)+star*vec3(0.23,0.3,0.4);
  vec2 broad=sphere(ro,rd,1.001);
  float closest=1e10; int best=-1; vec2 bary=vec2(0.0);
  if (broad.y > 0.0) {
    int stack[40]; int top=1; stack[0]=0;
    vec3 inv=1.0/(mix(vec3(-1.0),vec3(1.0),step(vec3(0.0),rd))*max(abs(rd),vec3(0.0000001)));
    for (int stepIndex=0; stepIndex<512; stepIndex++) {
      if(top==0) break;
      int node=stack[--top];
      vec4 lo=dataAt(uNodes,node*3),hi=dataAt(uNodes,node*3+1);
      if(!boxHit(ro,inv,lo.xyz,hi.xyz,closest)) continue;
      if(lo.w>=0.0) {
        for(int j=0;j<4;j++) {
          if(j>=int(hi.w)) break;
          int t=int(lo.w)+j; vec3 a=dataAt(uTriangles,t*9).xyz;
          vec3 e1=dataAt(uTriangles,t*9+1).xyz-a,e2=dataAt(uTriangles,t*9+2).xyz-a;
          vec3 p=cross(rd,e2); float det=dot(e1,p);
          if(abs(det)<0.00000001) continue;
          vec3 s=ro-a; float u=dot(s,p)/det; if(u<0.0||u>1.0) continue;
          vec3 q=cross(s,e1); float v=dot(rd,q)/det; if(v<0.0||u+v>1.0) continue;
          float d=dot(e2,q)/det;
          if(d>0.0001 && d<closest) {closest=d;best=t;bary=vec2(u,v);}
        }
      } else {
        vec4 children=dataAt(uNodes,node*3+2);
        if(top<38) {stack[top++]=int(children.x);stack[top++]=int(children.y);}
      }
    }
  }
  if(best>=0) {
    int t=best*9; float w=1.0-bary.x-bary.y;
    vec3 n=normalize(dataAt(uTriangles,t+3).xyz*w+dataAt(uTriangles,t+4).xyz*bary.x+dataAt(uTriangles,t+5).xyz*bary.y);
    vec2 aUV=dataAt(uTriangles,t+6).xy, bUV=dataAt(uTriangles,t+7).xy,cUV=dataAt(uTriangles,t+8).xy;
    vec2 texUV=aUV*w+bUV*bary.x+cUV*bary.y;
    // Ray traversal diverges across fragments: implicit texture derivatives are
    // undefined here and produce visible mip seams. Use an explicit LOD.
    vec3 albedo=pow(textureLod(uColor,texUV,0.0).rgb,vec3(2.2));
    vec3 e1=dataAt(uTriangles,t+1).xyz-dataAt(uTriangles,t).xyz;
    vec3 e2=dataAt(uTriangles,t+2).xyz-dataAt(uTriangles,t).xyz;
    vec2 du1=bUV-aUV,du2=cUV-aUV;
    float denom=du1.x*du2.y-du1.y*du2.x;
    if(abs(denom)>0.0000001) {
      vec3 tangent=normalize((e1*du2.y-e2*du1.y)/denom);
      tangent=normalize(tangent-n*dot(n,tangent));
      vec3 bitangent=normalize(cross(n,tangent))*sign(denom);
      vec3 map=textureLod(uNormal,texUV,0.0).xyz*2.0-1.0;
      n=normalize(mat3(tangent,bitangent,n)*mix(vec3(0.0,0.0,1.0),map,0.3));
    }
    float day=max(dot(n,sun),0.0);
    float water=1.0-smoothstep(0.03,0.16,max(albedo.r,albedo.g));
    float spec=pow(max(dot(n,normalize(sun-rd)),0.0),75.0)*water*day;
    float rim=pow(1.0-max(dot(n,-rd),0.0),3.0);
    color=albedo*(0.045+day*1.7)+vec3(0.55,0.7,0.9)*spec*0.38;
    color+=vec3(0.025,0.2,0.48)*rim*(0.1+day)*0.42;
  }
  vec2 shell=sphere(ro,rd,1.025);
  if(shell.y>0.0) {
    float start=max(shell.x,0.0),end=best>=0?min(closest,shell.y):shell.y;
    float optical=0.0, light=0.0;
    for(int j=0;j<8;j++) {
      vec3 p=ro+rd*mix(start,end,(float(j)+0.5)/8.0);
      float density=exp(-max(length(p)-1.0,0.0)*140.0);
      optical+=density*(end-start)/8.0;
      light+=density*(end-start)/8.0*smoothstep(-0.15,0.3,dot(normalize(p),sun));
    }
    color=color*exp(-optical*1.2)+vec3(0.075,0.35,0.85)*light*3.5;
  }
  vec3 mapped=pow(aces(color),vec3(1.0/2.2));
  float luminance=dot(mapped,vec3(.2126,.7152,.0722));
  outColor=vec4(mix(mapped,vec3(luminance),uMonochrome),1.0);
}`;
