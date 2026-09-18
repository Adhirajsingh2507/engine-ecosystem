import { Vec3 } from "@engine/math";
import type { Material } from "./tracer.ts";
import type { MeshVertex, TriMeshObj } from "./mesh.ts";
import { sphereMesh, cylinderMesh, coneMesh, torusMesh, combineMeshes } from "./mesh.ts";

/**
 * Procedural devotional Garuda model.
 *
 * Art direction combines the supplied references: a white anthropomorphic
 * Garuda, dense gold ornament, a readable wings-spread flight silhouette, and
 * an optional four-armed Vishnu rider. The model faces -Z.
 */

const MATERIALS: Material[] = [
  { albedo: new Vec3(0.96, 0.95, 0.91), roughness: 0.34 },
  { albedo: new Vec3(0.74, 0.78, 0.82), roughness: 0.48 },
  { albedo: new Vec3(1.00, 0.73, 0.20), metal: true, roughness: 0.07 },
  { albedo: new Vec3(0.70, 0.35, 0.06), metal: true, roughness: 0.20 },
  { albedo: new Vec3(0.96, 0.55, 0.09), roughness: 0.20 },
  { albedo: new Vec3(0.025, 0.018, 0.012), roughness: 0.10 },
  { albedo: new Vec3(0.63, 0.02, 0.04), roughness: 0.18 },
  { albedo: new Vec3(0.13, 0.42, 0.86), roughness: 0.38 },
  { albedo: new Vec3(1.00, 0.58, 0.05), roughness: 0.42 },
  { albedo: new Vec3(0.10, 0.48, 0.22), roughness: 0.46 },
  { albedo: new Vec3(0.95, 0.13, 0.28), roughness: 0.40 },
  { albedo: new Vec3(1.00, 0.69, 0.18), emission: new Vec3(2.7, 1.65, 0.48) },
];

const WHITE = 0;
const SHADOW = 1;
const GOLD = 2;
const OLD_GOLD = 3;
const BEAK = 4;
const EYE = 5;
const RUBY = 6;
const BLUE = 7;
const YELLOW = 8;
const GREEN = 9;
const MAGENTA = 10;
const HALO = 11;

type MeshPart = { vertices: MeshVertex[]; indices: number[]; matIndices: number[] };

function transformPart(part: MeshPart, translate: Vec3, scale = Vec3.one): MeshPart {
  return {
    vertices: part.vertices.map((vertex) => ({
      position: new Vec3(
        vertex.position.x * scale.x + translate.x,
        vertex.position.y * scale.y + translate.y,
        vertex.position.z * scale.z + translate.z,
      ),
      normal: new Vec3(
        vertex.normal.x / scale.x,
        vertex.normal.y / scale.y,
        vertex.normal.z / scale.z,
      ).normalize(),
    })),
    indices: part.indices,
    matIndices: part.matIndices,
  };
}

function ellipsoid(center: Vec3, scale: Vec3, material: number, segments = 20, rings = 14): MeshPart {
  return transformPart(sphereMesh(Vec3.zero, 1, material, segments, rings), center, scale);
}

function limb(start: Vec3, end: Vec3, radiusA: number, radiusB: number, material: number): MeshPart {
  return cylinderMesh(start, end.sub(start), radiusA, radiusB, material, 12);
}

/** A tapered feather plate oriented between two 3D points. */
function featherMesh(root: Vec3, tip: Vec3, width: number, material: number): MeshPart {
  const unit = tip.sub(root).normalize();
  const front = new Vec3(0, 0, -1);
  const side = unit.cross(front).normalize();
  const normal = side.cross(unit).normalize();
  const p20 = root.lerp(tip, 0.20);
  const p55 = root.lerp(tip, 0.55);
  const p82 = root.lerp(tip, 0.82);
  const ridge = root.lerp(tip, 0.52).add(front.scale(0.055));
  const boundary = [
    root,
    p20.add(side.scale(width * 0.42)),
    p55.add(side.scale(width * 0.55)),
    p82.add(side.scale(width * 0.27)),
    tip,
    p82.sub(side.scale(width * 0.27)),
    p55.sub(side.scale(width * 0.55)),
    p20.sub(side.scale(width * 0.42)),
  ];
  const vertices: MeshVertex[] = [
    { position: ridge, normal },
    ...boundary.map((position) => ({ position, normal })),
  ];
  const indices: number[] = [];
  for (let i = 0; i < boundary.length; i++) {
    indices.push(0, i + 1, ((i + 1) % boundary.length) + 1);
  }
  return { vertices, indices, matIndices: new Array(indices.length / 3).fill(material) };
}

function jeweledBand(center: Vec3, radius: number, axis: Vec3, beads = 8): MeshPart[] {
  const parts: MeshPart[] = [torusMesh(center, radius, 0.045, GOLD, axis, 24, 7)];
  for (let i = 0; i < beads; i++) {
    const angle = (i / beads) * Math.PI * 2;
    const pos = center.add(new Vec3(Math.cos(angle) * radius, Math.sin(angle) * radius, -0.035));
    parts.push(sphereMesh(pos, 0.048, i % 2 ? RUBY : GOLD, 8, 6));
  }
  return parts;
}

function crown(base: Vec3, radius: number, height: number): MeshPart[] {
  const parts: MeshPart[] = [
    torusMesh(base, radius, 0.07, GOLD, new Vec3(0, 1, 0), 28, 8),
    coneMesh(base.add(new Vec3(0, 0.03, 0)), new Vec3(0, height, 0), radius * 0.82, GOLD, 18),
    torusMesh(base.add(new Vec3(0, height * 0.43, 0)), radius * 0.55, 0.045, OLD_GOLD, new Vec3(0, 1, 0), 20, 6),
    sphereMesh(base.add(new Vec3(0, height + 0.08, 0)), radius * 0.16, GOLD, 10, 7),
  ];
  for (let i = -2; i <= 2; i++) {
    parts.push(sphereMesh(
      base.add(new Vec3(i * radius * 0.30, 0.08 + (2 - Math.abs(i)) * 0.035, -radius * 0.82)),
      radius * 0.10,
      i % 2 === 0 ? RUBY : GOLD,
      8,
      6,
    ));
  }
  return parts;
}

function wing(side: number): MeshPart[] {
  const parts: MeshPart[] = [];
  const shoulder = new Vec3(side * 0.72, 4.45, 0.20);
  const elbow = new Vec3(side * 2.55, 5.78, 0.22);
  const wrist = new Vec3(side * 4.25, 6.82, 0.28);
  parts.push(limb(shoulder, elbow, 0.30, 0.23, WHITE));
  parts.push(limb(elbow, wrist, 0.24, 0.12, GOLD));

  for (let i = 0; i < 13; i++) {
    const t = i / 12;
    const root = elbow.lerp(wrist, 0.30 + t * 0.66).add(new Vec3(0, -0.18 + t * 0.13, i * 0.008));
    const tip = new Vec3(side * (5.0 + t * 1.65), 3.65 + t * 4.55, 0.42 + t * 0.18);
    const mat = i === 0 || i >= 11 ? GOLD : (i % 4 === 0 ? SHADOW : WHITE);
    parts.push(featherMesh(root, tip, 0.72 - t * 0.14, mat));
    if (i % 3 === 0) parts.push(limb(root, tip, 0.025, 0.010, OLD_GOLD));
  }

  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const root = shoulder.lerp(elbow, 0.08 + t * 0.88).add(new Vec3(0, -0.12, -0.08));
    const tip = new Vec3(side * (2.25 + t * 2.95), 3.70 + t * 2.60, -0.03);
    parts.push(featherMesh(root, tip, 0.72, i % 5 === 0 ? GOLD : WHITE));
  }

  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const center = shoulder.lerp(wrist, t);
    parts.push(ellipsoid(center.add(new Vec3(0, -0.08, -0.17)), new Vec3(0.30, 0.20, 0.10), i % 2 ? GOLD : OLD_GOLD, 12, 8));
  }
  return parts;
}

function garudaHead(parts: MeshPart[]): void {
  const head = new Vec3(0, 5.02, -0.16);
  parts.push(ellipsoid(head, new Vec3(0.47, 0.55, 0.45), WHITE, 24, 18));
  parts.push(ellipsoid(head.add(new Vec3(0, 0.08, -0.37)), new Vec3(0.34, 0.28, 0.18), WHITE, 18, 12));
  for (const side of [-1, 1]) {
    parts.push(sphereMesh(head.add(new Vec3(side * 0.18, 0.12, -0.40)), 0.065, EYE, 10, 8));
    parts.push(limb(
      head.add(new Vec3(side * 0.28, 0.22, -0.40)),
      head.add(new Vec3(side * 0.07, 0.17, -0.48)),
      0.035,
      0.025,
      GOLD,
    ));
  }
  parts.push(coneMesh(head.add(new Vec3(0, 0.02, -0.40)), new Vec3(0, -0.03, -0.62), 0.22, BEAK, 14));
  parts.push(coneMesh(head.add(new Vec3(0, -0.11, -0.67)), new Vec3(0, -0.22, -0.13), 0.11, BEAK, 10));
  parts.push(...crown(head.add(new Vec3(0, 0.46, 0)), 0.43, 0.82));
}

function garudaBody(parts: MeshPart[]): void {
  parts.push(ellipsoid(new Vec3(0, 3.55, 0), new Vec3(0.83, 1.18, 0.60), WHITE, 26, 18));
  parts.push(ellipsoid(new Vec3(0, 4.14, -0.46), new Vec3(0.64, 0.48, 0.16), SHADOW, 18, 12));
  parts.push(limb(new Vec3(0, 4.25, 0), new Vec3(0, 4.62, -0.08), 0.30, 0.26, WHITE));
  parts.push(...jeweledBand(new Vec3(0, 4.17, -0.06), 0.55, new Vec3(0, 1, 0), 10));
  parts.push(torusMesh(new Vec3(0, 3.84, -0.07), 0.70, 0.045, OLD_GOLD, new Vec3(0, 1, 0), 28, 8));
  parts.push(sphereMesh(new Vec3(0, 3.70, -0.62), 0.18, RUBY, 14, 10));
  parts.push(torusMesh(new Vec3(0, 2.86, 0), 0.78, 0.075, GOLD, new Vec3(0, 1, 0), 28, 8));
  for (const side of [-1, 1]) {
    parts.push(ellipsoid(new Vec3(side * 0.72, 4.12, -0.03), new Vec3(0.30, 0.23, 0.30), GOLD, 14, 10));
  }

  const leftShoulder = new Vec3(-0.66, 4.03, -0.14);
  const rightShoulder = new Vec3(0.66, 4.03, -0.14);
  const leftElbow = new Vec3(-0.82, 3.48, -0.55);
  const rightElbow = new Vec3(0.82, 3.48, -0.55);
  const leftPalm = new Vec3(-0.11, 3.70, -0.88);
  const rightPalm = new Vec3(0.11, 3.70, -0.88);
  parts.push(limb(leftShoulder, leftElbow, 0.18, 0.15, WHITE));
  parts.push(limb(rightShoulder, rightElbow, 0.18, 0.15, WHITE));
  parts.push(limb(leftElbow, leftPalm, 0.15, 0.10, WHITE));
  parts.push(limb(rightElbow, rightPalm, 0.15, 0.10, WHITE));
  parts.push(ellipsoid(leftPalm, new Vec3(0.11, 0.25, 0.07), WHITE, 12, 8));
  parts.push(ellipsoid(rightPalm, new Vec3(0.11, 0.25, 0.07), WHITE, 12, 8));
  parts.push(torusMesh(leftElbow.lerp(leftPalm, 0.78), 0.13, 0.035, GOLD, new Vec3(0, 1, 0), 16, 6));
  parts.push(torusMesh(rightElbow.lerp(rightPalm, 0.78), 0.13, 0.035, GOLD, new Vec3(0, 1, 0), 16, 6));

  parts.push(ellipsoid(new Vec3(0, 2.40, 0.02), new Vec3(0.79, 0.70, 0.56), OLD_GOLD, 20, 14));
  parts.push(ellipsoid(new Vec3(0, 2.25, -0.49), new Vec3(0.46, 0.56, 0.13), GOLD, 16, 10));
  for (const side of [-1, 1]) {
    const hip = new Vec3(side * 0.34, 2.30, 0.08);
    const knee = new Vec3(side * 0.78, 2.00, 0.72);
    const ankle = new Vec3(side * 0.48, 2.42, 1.34);
    parts.push(limb(hip, knee, 0.25, 0.20, WHITE));
    parts.push(limb(knee, ankle, 0.20, 0.12, WHITE));
    parts.push(torusMesh(knee.lerp(ankle, 0.82), 0.14, 0.03, GOLD, new Vec3(0, 1, 0), 14, 6));
    for (let toe = -1; toe <= 1; toe++) {
      parts.push(coneMesh(ankle.add(new Vec3(toe * 0.09, 0, -0.02)), new Vec3(toe * 0.04, -0.13, -0.36), 0.055, BEAK, 8));
    }
  }

  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const root = new Vec3((t - 0.5) * 0.55, 2.55, 0.40);
    const tip = new Vec3((t - 0.5) * 2.9, 0.82 - Math.abs(t - 0.5) * 0.35, 1.15);
    parts.push(featherMesh(root, tip, 0.34, i % 4 === 0 ? GOLD : WHITE));
  }
}

function vishnuArm(parts: MeshPart[], shoulder: Vec3, elbow: Vec3, hand: Vec3): void {
  parts.push(limb(shoulder, elbow, 0.14, 0.12, BLUE));
  parts.push(limb(elbow, hand, 0.12, 0.085, BLUE));
  parts.push(sphereMesh(hand, 0.105, BLUE, 10, 8));
  parts.push(torusMesh(elbow.lerp(hand, 0.78), 0.12, 0.027, GOLD, new Vec3(0, 1, 0), 14, 6));
}

function vishnuRider(parts: MeshPart[]): void {
  const pelvis = new Vec3(0, 5.54, 0.33);
  const torso = new Vec3(0, 6.46, 0.22);
  const head = new Vec3(0, 7.48, 0.08);
  parts.push(ellipsoid(torso, new Vec3(0.55, 0.82, 0.38), BLUE, 22, 16));
  parts.push(sphereMesh(head, 0.39, BLUE, 22, 16));
  parts.push(limb(new Vec3(0, 7.03, 0.12), new Vec3(0, 7.18, 0.10), 0.21, 0.18, BLUE));
  for (const side of [-1, 1]) {
    parts.push(sphereMesh(head.add(new Vec3(side * 0.14, 0.07, -0.33)), 0.045, EYE, 9, 6));
  }
  parts.push(limb(head.add(new Vec3(0, 0.04, -0.39)), head.add(new Vec3(0, 0.02, -0.45)), 0.045, 0.035, BLUE));
  parts.push(...crown(head.add(new Vec3(0, 0.34, 0)), 0.37, 0.88));
  parts.push(...jeweledBand(new Vec3(0, 6.82, 0.05), 0.39, new Vec3(0, 1, 0), 8));
  parts.push(sphereMesh(new Vec3(0, 6.34, -0.35), 0.11, RUBY, 12, 8));
  parts.push(torusMesh(new Vec3(0, 5.82, 0.28), 0.53, 0.055, GOLD, new Vec3(0, 1, 0), 24, 7));
  parts.push(ellipsoid(pelvis, new Vec3(0.58, 0.48, 0.42), YELLOW, 18, 12));
  parts.push(featherMesh(new Vec3(-0.38, 6.70, 0.30), new Vec3(-1.30, 5.20, 0.72), 0.27, GREEN));
  parts.push(featherMesh(new Vec3(0.38, 6.68, 0.30), new Vec3(1.45, 5.05, 0.82), 0.28, MAGENTA));

  vishnuArm(parts, new Vec3(-0.48, 6.72, 0.15), new Vec3(-1.02, 7.05, -0.02), new Vec3(-1.28, 7.52, -0.15));
  vishnuArm(parts, new Vec3(0.48, 6.72, 0.15), new Vec3(1.02, 7.05, -0.02), new Vec3(1.28, 7.52, -0.15));
  vishnuArm(parts, new Vec3(-0.48, 6.36, 0.10), new Vec3(-0.93, 6.02, -0.18), new Vec3(-1.30, 5.84, -0.42));
  vishnuArm(parts, new Vec3(0.48, 6.36, 0.10), new Vec3(0.93, 6.02, -0.18), new Vec3(1.30, 5.84, -0.42));

  parts.push(torusMesh(new Vec3(-1.30, 7.65, -0.15), 0.26, 0.035, GOLD, new Vec3(0, 0, 1), 26, 7));
  parts.push(torusMesh(new Vec3(-1.30, 7.65, -0.15), 0.12, 0.025, OLD_GOLD, new Vec3(0, 0, 1), 18, 6));
  parts.push(ellipsoid(new Vec3(1.30, 7.63, -0.15), new Vec3(0.15, 0.22, 0.13), WHITE, 14, 10));
  parts.push(coneMesh(new Vec3(1.30, 7.77, -0.15), new Vec3(0, 0.21, 0), 0.08, WHITE, 10));

  for (const side of [-1, 1]) {
    const hip = pelvis.add(new Vec3(side * 0.25, -0.02, 0));
    const knee = new Vec3(side * 0.82, 5.18, 0.14);
    const foot = new Vec3(side * 0.38, 4.82, -0.04);
    parts.push(limb(hip, knee, 0.20, 0.16, YELLOW));
    parts.push(limb(knee, foot, 0.16, 0.10, BLUE));
    parts.push(ellipsoid(foot, new Vec3(0.20, 0.09, 0.28), BLUE, 12, 8));
    parts.push(torusMesh(knee.lerp(foot, 0.76), 0.12, 0.026, GOLD, new Vec3(0, 1, 0), 14, 6));
  }
  parts.push(torusMesh(new Vec3(0, 7.50, 0.52), 0.72, 0.075, HALO, new Vec3(0, 0, 1), 36, 10));
}

export interface GarudaOptions {
  includeVishnu?: boolean;
}

export function buildGaruda(options: GarudaOptions = {}): TriMeshObj {
  const { includeVishnu = true } = options;
  const parts: MeshPart[] = [];
  parts.push(...wing(-1), ...wing(1));
  garudaBody(parts);
  garudaHead(parts);
  if (includeVishnu) vishnuRider(parts);
  return combineMeshes(parts, MATERIALS);
}
