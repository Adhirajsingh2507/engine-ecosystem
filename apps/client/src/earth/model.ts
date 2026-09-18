import { Triangle, Vec3 } from '@engine/math';
import { BVH } from '../../../server/src/bvh.ts';

type Accessor = { bufferView: number; byteOffset?: number; count: number; componentType: number; type: string };
type View = { byteOffset?: number; byteLength: number; byteStride?: number };
interface Gltf {
  asset: { version: string };
  accessors: Accessor[]; bufferViews: View[];
  meshes: { primitives: { attributes: Record<string, number>; indices: number; material: number; mode?: number }[] }[];
  materials: { pbrMetallicRoughness: { baseColorTexture: { index: number } }; normalTexture: { index: number } }[];
  textures: { source: number }[]; images: { bufferView: number; mimeType: string }[];
}

/** Loader scoped to the bundled, uncompressed NASA Earth GLB, not arbitrary uploads. */
export async function loadEarth(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Earth model download failed (${response.status}).`);
  const buffer = await response.arrayBuffer();
  const header = new DataView(buffer);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) throw new Error('Invalid GLB 2 model.');
  const jsonSize = header.getUint32(12, true);
  const gltf: Gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonSize)));
  const binOffset = 20 + jsonSize + 8;
  const binLength = header.getUint32(binOffset - 8, true);
  if (header.getUint32(binOffset - 4, true) !== 0x004e4942 || binOffset + binLength > buffer.byteLength) throw new Error('Missing GLB binary data.');
  const read = (index: number): number[] => {
    const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
    const components = ({ SCALAR: 1, VEC2: 2, VEC3: 3 } as Record<string, number>)[a.type];
    if (!components || ![5123, 5125, 5126].includes(a.componentType)) throw new Error('Unsupported Earth accessor.');
    const size = a.componentType === 5123 ? 2 : 4;
    const stride = view.byteStride ?? size * components;
    const base = binOffset + (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    return Array.from({ length: a.count * components }, (_, k) => {
      const offset = base + Math.floor(k / components) * stride + (k % components) * size;
      return a.componentType === 5126 ? header.getFloat32(offset, true) : a.componentType === 5123 ? header.getUint16(offset, true) : header.getUint32(offset, true);
    });
  };
  const primitive = gltf.meshes[0].primitives[0];
  if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error('Earth primitive must contain triangles.');
  const positions = read(primitive.attributes.POSITION), normals = read(primitive.attributes.NORMAL);
  const uvs = read(primitive.attributes.TEXCOORD_0), indices = read(primitive.indices);
  // Normalize the original mesh to a radius of one; retain its geometry and UVs.
  let radius = 0;
  for (let i = 0; i < positions.length; i += 3) radius = Math.max(radius, Math.hypot(...positions.slice(i, i + 3)));
  const vertices = Array.from({ length: positions.length / 3 }, (_, i) => new Vec3(positions[i*3] / radius, positions[i*3+1] / radius, positions[i*3+2] / radius));
  const triangles = Array.from({ length: indices.length / 3 }, (_, i) => ({ tri: new Triangle(vertices[indices[i*3]], vertices[indices[i*3+1]], vertices[indices[i*3+2]]), matIndex: i }));
  const bvh = new BVH(triangles).toTextureData();
  const packed = new Float32Array(indices.length / 3 * 36);
  bvh.triangleIds.forEach((original, i) => {
    for (let v = 0; v < 3; v++) {
      const index = indices[original*3+v], p = vertices[index];
      packed.set([p.x, p.y, p.z, 0], i*36+v*4);
      packed.set([normals[index*3], normals[index*3+1], normals[index*3+2], 0], i*36+12+v*4);
      packed.set([uvs[index*2], uvs[index*2+1], 0, 0], i*36+24+v*4);
    }
  });
  const decode = async (index: number) => {
    const img = gltf.images[gltf.textures[index].source], v = gltf.bufferViews[img.bufferView];
    return createImageBitmap(new Blob([buffer.slice(binOffset + (v.byteOffset ?? 0), binOffset + (v.byteOffset ?? 0) + v.byteLength)], { type: img.mimeType }), { colorSpaceConversion: 'none' });
  };
  const material = gltf.materials[primitive.material];
  const results = await Promise.allSettled([decode(material.pbrMetallicRoughness.baseColorTexture.index), decode(material.normalTexture.index)]);
  if (signal.aborted || results.some(r => r.status === 'rejected')) {
    results.forEach(r => { if (r.status === 'fulfilled') r.value.close(); });
    throw new Error(signal.aborted ? 'Earth loading cancelled.' : 'Earth texture decoding failed.');
  }
  return { nodes: bvh.nodes, triangles: packed, color: (results[0] as PromiseFulfilledResult<ImageBitmap>).value, normal: (results[1] as PromiseFulfilledResult<ImageBitmap>).value, triangleCount: indices.length / 3 };
}
