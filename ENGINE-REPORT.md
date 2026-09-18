# Engine Report — physics, math & graphics

This folder (`gdg/engine/`) is the **consolidated canonical copy** of the 3D
engine ecosystem previously built across two divergent trees. It is a byte-copy
of the more complete tree (`devx/3d-game`), with generated/vendor dirs
(`node_modules`, `dist`, `.git`, `.vercel`, `.21st`) excluded.

- **Source of truth:** `devx/3d-game` (superset)
- **Superseded copy left in place:** `orbit-trust/game` (older ancestor, no unique code)
- **Related but separate:** `orbit-trust/engine/orbit_core` (Rust orbital math — see §5, not copied here)

---

## 1. What type of engine is this — 2D or 3D?

**It is a 3D engine. There is no 2D game engine here.** Every primitive
(`Vec3`, `Quaternion`, `Mat4`, `Transform`), the rigid-body physics, and both
renderers are 3D. There is no `Vec2`, no sprite/tilemap/2D-physics layer.

It is really **three 3D rendering approaches over one shared math core**:

| Engine | Kind | Where |
|---|---|---|
| Real-time rasterizer | 3D WebGL2 forward renderer — Cook-Torrance PBR, shadow maps, HDR bloom, ACES | `apps/client/renderer.ts`, `shaders.ts` |
| Offline path tracer | 3D Monte-Carlo ray tracer — diffuse GI, BVH, depth of field | `apps/server/tracer.ts` |
| GPU raytracer | 3D fragment-shader BVH tracer (interactive Earth) | `apps/client/earth/` |

The only "2D" anywhere is incidental: fullscreen 2D quad passes in
post-processing, and — in the separate Rust core — a 2D collision-probability
integrator on the encounter plane.

---

## 2. Structure

```
engine/
├── packages/
│   ├── math/        # 3D linear algebra + geometry + intersection (bottom layer)
│   └── physics/     # rigid-body dynamics, broad/narrow phase, impulse solver
├── apps/
│   ├── client/      # WebGL2 real-time renderer + interactive Earth GPU raytracer
│   └── server/      # offline Monte-Carlo path tracer + BVH + procedural meshes
└── docs/            # vision.md (layered-architecture intent), SESSION.md
```

Dependency order: **math → physics → renderers → apps**. TypeScript compiles to
both browser and Node, so the client and server share the exact same math/physics
code (no bindings, no WASM). This shared-core design is the stated intent in
`docs/vision.md`.

---

## 3. Math library — `packages/math`

Immutable, right-handed, column-major (WebGL / gl-matrix convention). Fully unit-tested.

| File | Contents |
|---|---|
| `vec3.ts` | Immutable `Vec3`: add/sub/scale, dot, cross, length, zero-safe normalize, lerp, distance, eps-equals |
| `quaternion.ts` | Unit `Quaternion` (x,y,z,w): `fromAxisAngle`, Hamilton multiply, `rotate`, conjugate/inverse, **slerp** (short-path + near-parallel lerp fallback) |
| `mat4.ts` | 4×4: multiply, transpose, translation/scaling, `fromQuaternion`, transformPoint/Direction, **determinant + full inverse**, **perspective/orthographic/lookAt** |
| `transform.ts` | TRS transform (T·R·S), immutable `with*` builders → Mat4 |
| `geometry.ts` | `Ray` (auto-normalized), `Aabb` (fromCenter, closestPoint, contains), `Sphere` |
| `intersect.ts` | `raySphere`, `rayAabb` (slab), `sphereSphere`, `aabbAabb`, `sphereAabb` |
| `triangle.ts` | `Triangle` (face normal) + **Möller–Trumbore `rayTriangle`** with barycentrics + optional backface cull |

---

## 4. Physics engine — `packages/physics`

3D rigid-body dynamics. Fully unit-tested.

| File | Contents |
|---|---|
| `rigidbody.ts` | Linear + angular dynamics, semi-implicit Euler, quaternion orientation integrated as `q += ½·dt·(ω⊗q)` + renormalize. Scalar (isotropic) inertia. mass 0 = static |
| `broadphase.ts` | `SpatialHash` uniform-grid broad phase — candidate pairs, superset (no false negatives) |
| `narrowphase.ts` | `sphereSphereContact`, `sphereAabbContact` → `Contact{normal, depth, point}` |
| `solver.ts` | `resolveContact`: impulse w/ restitution + positional correction (80% / 0.01 slop). Linear only |
| `world.ts` | `World` with uniform gravity; steps + integrates bodies |

**Status:** the collision path is now **wired into `World.step()`** (broadphase →
narrowphase → impulse solver) for any body carrying a `Collider`. Handles
sphere↔sphere, sphere↔box, and box↔box, with restitution + Coulomb friction.
`RigidBody` now also supports a full `Mat3` inertia tensor alongside the scalar
fast-path. Remaining simplifications (flagged in-code): no angular contact torque
from off-centre hits, no gyroscopic term, no CCD/sleeping.

> This document is the point-in-time consolidation + diff record. For the current
> layout and status, see **`README.md`**. Summary of what was added after
> consolidation: 2D math (`Vec2`, `Transform2D`, 2D geometry/intersections) and
> `Mat3`/`Vec4`; physics collisions wired in + inertia tensor + friction + box↔box;
> a new `packages/ecs` (Registry/query, SceneNode, Signal, Scheduler); and a new
> Rust `crates/num-rs` (Gauss-Legendre quadrature + 3×3 linalg extracted from
> `orbit_core`, which keeps its orbital-specific Pc).

---

## 5. Graphics

### Real-time — `apps/client` (WebGL2)
- `gl.ts` — program compile/link, HDR (RGBA16F) color targets, depth targets for shadow maps.
- `shaders.ts` — GLSL ES 3.00: **Cook-Torrance PBR** (GGX + Smith + Schlick), **PCF shadow mapping**, hemispheric ambient, procedural AA grid floor, post stack (**bright-pass → separable Gaussian blur → bloom → ACES → gamma → vignette**).
- `renderer.ts` — forward+post pipeline: shadow depth → HDR PBR scene → bloom → composite. 2048² shadow map.
- `sphere.ts`, `viewer.ts`, `main.ts` — geometry, orbit viewer, entry point.

### Interactive Earth GPU raytracer — `apps/client/src/earth/`
- `shaders.ts` — GPU fragment-shader **path tracer**: BVH packed into float textures, stack-based traversal, Möller–Trumbore in GLSL, tangent-space normal mapping, day/night terminator, ocean specular, atmospheric scattering shell, ACES.
- `renderer.ts` — WebGL2 setup, adaptive resolution, software-renderer detection, frame-skip, satellite `projectOrbit` overlay math.
- `model.ts` — from-scratch **GLB 2.0 parser** for the NASA Earth model → unit-radius normalize → BVH → texture-packed triangles.

### Offline — `apps/server` (Node)
- `tracer.ts` — **Monte-Carlo path tracer** on the shared math core: cosine-weighted hemisphere GI, emissive area lights + optional sun direct light, metal/rough BSDF, firefly clamp, deterministic `mulberry32` PRNG, **thin-lens depth-of-field camera**, ACES.
- `bvh.ts` — flat SAH-inspired **BVH** (longest-axis centroid split, ≤4 tris/leaf), smooth normals, `toTextureData()` for the GPU tracer.
- `mesh.ts` — `TriMesh` (BVH-backed) + procedural **sphere / cylinder / cone / torus** generators + `combineMeshes`.
- `garuda.ts`, `garuda-scene.ts` — procedural devotional Garuda model + scene.
- `scene.ts`, `render.ts`, `png.ts` — scene defs, CLI render loop (`--scene garuda`), PNG output.

---

## 6. Precise diff — `devx/3d-game` vs `orbit-trust/game`

**`orbit-trust/game` is a strict older ancestor. It contains no unique code.**
Everything in it exists in `devx/3d-game`; shared files differ only by features
`devx` *adds*.

### Files only in `devx/3d-game` (13)
```
packages/math/src/triangle.ts
apps/server/src/bvh.ts
apps/server/src/garuda-scene.ts
apps/server/src/garuda.ts
apps/server/src/mesh.ts
apps/server/test/earth-bvh.test.ts
apps/server/test/garuda.test.ts
apps/client/src/viewer.ts
apps/client/src/earth/model.ts
apps/client/src/earth/renderer.ts
apps/client/src/earth/shaders.ts
apps/client/public/garuda.png
```

### Shared files that differ — all purely additive in `devx`
| File | What `devx` adds over `orbit-trust/game` |
|---|---|
| `packages/math/src/index.ts` | Exports `Triangle`, `rayTriangle`, `TriHit` |
| `apps/server/src/tracer.ts` | Triangle-mesh/BVH intersection in `intersect()`; configurable sky (`skyHorizon/Zenith/Intensity`); sun direct-lighting (`sunDirection/sunColor`). orbit-trust's `sky()` is hardcoded, no mesh support |
| `apps/server/src/render.ts` | `--scene garuda` CLI selection + camera switch. orbit-trust renders only the default scene |
| `README.md`, `apps/client/index.html` | Documentation / markup only |

**Provenance:** `orbit-trust/game` = the sphere-only path tracer + real-time
renderer stage; `devx/3d-game` = that plus triangle meshes, BVH, the Earth GPU
raytracer, and the Garuda scene. Safe to treat `orbit-trust/game` as disposable.

---

## 7. Separate: Rust orbital numerics — `orbit-trust/engine/orbit_core`

Not part of this game engine and **not copied here** (it's a Rust crate with its
own Cargo/PyO3 build; moving it would break its project). Documented for completeness:

- 250 LOC Rust + PyO3, exposed to Python as `orbit_core`.
- **2D collision probability (Pc)** over a hard-body disk via runtime-computed
  **Gauss-Legendre quadrature** (radial) + periodic trapezoid rule (angular),
  with a two-grid convergence gate (64×128 / 128×256 / 256×512).
- `project_and_pc` — projects two object states (position, velocity, 3×3
  covariance, radius) onto the encounter plane → TCA, miss distance, Pc.
- `pc_2d_batch` — Rayon-parallel batch over fleet pairs.
- Ships a prebuilt manylinux wheel in `orbit-trust/engine/vendor/wheels/`.
