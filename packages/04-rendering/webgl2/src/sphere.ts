export interface Mesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
}

/** Unit UV-sphere centred at the origin. For a unit sphere, normals == positions. */
export function uvSphere(segments = 24, rings = 16): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= rings; y++) {
    const phi = (y / rings) * Math.PI; // 0..π (pole to pole)
    for (let x = 0; x <= segments; x++) {
      const theta = (x / segments) * Math.PI * 2; // around
      positions.push(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      );
    }
  }

  const stride = segments + 1;
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * stride + x;
      const b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const pos = new Float32Array(positions);
  return { positions: pos, normals: pos.slice(), indices: new Uint16Array(indices) };
}
