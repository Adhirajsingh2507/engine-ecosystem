// Registry scan — pure, no side effects beyond reading package manifests.
// Discovers vendorable packages from the monorepo so the CLI never drifts from
// what actually exists.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** Human blurbs, keyed by package name (the manifests carry no description). */
export const DESCRIPTIONS = {
  "@engine/math": "Vec2/3/4, Mat3/4, Quaternion, Transform (2D + 3D)",
  "@engine/geometry": "Ray/Aabb/Sphere/Triangle, intersections, BVH, TriMesh",
  "@engine/core": "deterministic RNG, interpolation/easing, fixed-timestep loop",
  "@engine/physics": "rigid bodies, collision pipeline, impulse solver",
  "@engine/ecs": "registry + typed query, scene graph, signals, scheduler",
  "@engine/engine": "runtime integrator (ECS + scheduler + fixed loop + scene)",
  "@engine/render-core": "render graph, PBR materials, lighting/shadow math, colour",
  "@engine/render-webgl2": "WebGL2 forward renderer (PBR, shadows, bloom, ACES)",
  "@engine/world": "value noise + FBM, heightmap terrain analysis + mesh",
  "@engine/gameplay": "keyframe animation, A* nav + steering, behaviour trees",
  "@engine/net": "binary serialization, snapshot interp, prediction, deltas",
  "@engine/tools": "headless GLB loader, profiler, debug-draw",
  "@engine/scientific": "Kepler orbits, Julian date/GMST, RK4, forward kinematics",
  "num-rs": "Rust: Gauss-Legendre quadrature + 3x3 linalg",
};

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

/**
 * Scan the repo for vendorable packages.
 * @returns array of { name, kind, stability, category, dir, deps, description }
 */
export function scanRegistry(root) {
  const packages = [];

  const pkgRoot = join(root, "packages");
  if (isDir(pkgRoot)) {
    for (const cat of readdirSync(pkgRoot)) {
      const catDir = join(pkgRoot, cat);
      if (!isDir(catDir)) continue;
      for (const name of readdirSync(catDir)) {
        const manifest = join(catDir, name, "package.json");
        if (!existsSync(manifest)) continue;
        const p = JSON.parse(readFileSync(manifest, "utf8"));
        packages.push({
          name: p.name,
          kind: "ts",
          stability: p.stability ?? "unknown",
          category: cat,
          dir: join("packages", cat, name),
          deps: Object.keys(p.dependencies ?? {}).filter((d) => d.startsWith("@engine/")),
          description: DESCRIPTIONS[p.name] ?? "",
        });
      }
    }
  }

  const cratesRoot = join(root, "crates");
  if (isDir(cratesRoot)) {
    for (const name of readdirSync(cratesRoot)) {
      if (!existsSync(join(cratesRoot, name, "Cargo.toml"))) continue;
      packages.push({
        name,
        kind: "rust",
        stability: "stable",
        category: "crates",
        dir: join("crates", name),
        deps: [],
        description: DESCRIPTIONS[name] ?? "",
      });
    }
  }

  packages.sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name));
  return packages;
}

/** Map every accepted alias (full name and short name) → package. */
export function aliasMap(registry) {
  const map = new Map();
  for (const pkg of registry) {
    map.set(pkg.name, pkg);
    const short = pkg.name.replace(/^@engine\//, "");
    map.set(short, pkg);
  }
  return map;
}
