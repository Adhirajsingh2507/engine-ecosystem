import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vec3, Triangle, Ray, Aabb, rayAabb, rayTriangle } from '@engine/math';
import { BVH } from '../src/bvh.ts';

test('GPU BVH packing preserves indexed triangles, bounds and nearest ray hits', () => {
  const triangles=Array.from({length:40},(_,i)=>{
    const x=(i%8)-4,y=Math.floor(i/8)-2,z=-i*.04;
    return {tri:new Triangle(new Vec3(x,y,z),new Vec3(x+.8,y,z),new Vec3(x,y+.8,z)),matIndex:i};
  });
  const bvh=new BVH(triangles),packed=bvh.toTextureData();
  assert.deepEqual([...packed.triangleIds].sort((a,b)=>a-b),triangles.map(t=>t.matIndex));
  const visited:number[]=[];
  for(let i=0;i<packed.nodes.length;i+=12){
    const start=packed.nodes[i+3],count=packed.nodes[i+7];
    if(start>=0){assert.ok(count>=1&&count<=4);for(let j=0;j<count;j++)visited.push(start+j);}
    else {assert.ok(packed.nodes[i+8]*12<packed.nodes.length);assert.ok(packed.nodes[i+9]*12<packed.nodes.length);}
  }
  assert.deepEqual(visited.sort((a,b)=>a-b),Array.from({length:40},(_,i)=>i));
  for(let i=0;i<40;i++){
    const target=triangles[i].tri.v0.add(new Vec3(.15,.15,0));
    const ray=new Ray(new Vec3(target.x,target.y,4),new Vec3(0,0,-1));
    const expected=bvh.intersect(ray);assert.ok(expected);
    let best=Infinity,id=-1;const stack=[0];
    while(stack.length){
      const n=stack.pop()!*12,d=packed.nodes;
      const hit=rayAabb(ray,new Aabb(new Vec3(d[n],d[n+1],d[n+2]),new Vec3(d[n+4],d[n+5],d[n+6])));
      if(hit===null||hit>best)continue;
      if(d[n+3]>=0){for(let j=0;j<d[n+7];j++){const original=packed.triangleIds[d[n+3]+j];const h=rayTriangle(ray,triangles[original].tri);if(h&&h.t<best){best=h.t;id=original;}}}
      else stack.push(d[n+8],d[n+9]);
    }
    assert.equal(id,expected.matIndex);assert.ok(Math.abs(best-expected.t)<1e-6);
  }
  // Exported buffers must not mutate the engine's existing offline tree.
  packed.nodes.fill(0);
  assert.ok(bvh.intersect(new Ray(new Vec3(-3.85,-1.85,4),new Vec3(0,0,-1))));
});
