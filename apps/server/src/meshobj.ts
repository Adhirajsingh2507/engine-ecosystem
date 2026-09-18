import { TriMesh, combineMeshes, type MeshData } from "@engine/geometry";
import type { Material } from "./tracer.ts";

/**
 * A renderable mesh: pure geometry (`@engine/geometry` TriMesh) paired with this
 * app's material table. Keeps shading out of the geometry package — the mesh
 * carries only numeric material indices; the pairing lives here.
 */
export interface TriMeshObj {
  mesh: TriMesh;
  materials: Material[];
}

/** Combine mesh-data parts into a TriMesh and attach a material table. */
export function meshFromParts(parts: MeshData[], materials: Material[]): TriMeshObj {
  return { mesh: combineMeshes(parts), materials };
}
