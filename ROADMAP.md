# Roadmap

The target architecture, organised into 8 layered categories. Status is honest:
built code only — **no empty stub packages** (the repo grows as modules are filled).

Legend: ✅ built & tested · 🟡 partial / lives elsewhere in the tree · ⬜ planned

```
engine-ecosystem
│
├── 01 Foundation
│   ├── math               ✅  packages/01-foundation/math  (Vec2/3/4, Mat3/4, Quaternion, Transform/2D)
│   ├── geometry           ✅  packages/01-foundation/geometry  (Ray/Aabb/Sphere/Triangle + 2D +
│   │                          intersections · BVH · TriMesh) — split out of math
│   ├── numerics           ✅  crates/num-rs (Rust: Gauss-Legendre quadrature, 3×3 linalg)
│   └── core               ✅  packages/01-foundation/core  (Rng, interpolation/easing, FixedTimestep)
│
├── 02 Simulation
│   ├── physics            ✅  packages/02-simulation/physics  (RigidBody, World, contacts, solver)
│   ├── ECS                ✅  packages/02-simulation/ecs  (Registry, query, Scheduler, Signal)
│   ├── scene              🟡  SceneNode graph lives in ecs; promote to its own module if it grows
│   ├── collision          🟡  broad/narrow phase + solver live in physics
│   └── spatial            🟡  SpatialHash in physics; BVH in geometry; unify into a spatial module later
│
├── 03 Runtime (integration layer — not one of the 8 domain categories)
│   └── engine             ✅  packages/03-runtime/engine  (Engine: Registry + Scheduler +
│                              FixedTimestep + scene + backend-agnostic render callback)
│
├── 04 Rendering
│   ├── render-core        ⬜  device/pipeline/target abstraction shared across backends
│   ├── WebGL2             ✅  packages/04-rendering/webgl2  (PBR, PCF shadows, HDR bloom, ACES)
│   ├── WebGPU             ⬜  parallel backend behind render-core
│   ├── render graph       ⬜  pass scheduling / resource aliasing
│   ├── materials          ⬜  material/shader system
│   ├── lighting           ⬜  light types, shadow atlas, GI
│   └── ray tracing        🟡  offline path tracer (apps/server) + GPU Earth raytracer (apps/client/earth)
│
├── 05 World                              packages/05-world/world  (@engine/world)
│   ├── terrain            ✅  Heightmap: slope/roughness/traversability (TerraSight-style) + heightmap→mesh
│   ├── procedural gen     ✅  ValueNoise + fractal FBM, seeded via core.Rng
│   ├── water              ⬜
│   ├── atmosphere         🟡  scattering shell exists in the GPU Earth shader; generalise later
│   └── streaming          ⬜  chunked load/unload, LOD
│
├── 06 Gameplay                           packages/06-gameplay/gameplay  (@engine/gameplay)
│   ├── animation          ✅  Track<T>/Clip keyframe sampling with per-segment easing
│   ├── audio              ⬜  (browser-only; deferred until it can be tested headless)
│   ├── navigation         ✅  grid A* (4/8-way, no corner-cutting) + steering (seek/arrive/flee)
│   └── AI                 ✅  functional behaviour trees (sequence/selector/invert/…)
│
├── 07 Networking                         packages/07-networking/net  (@engine/net)
│   ├── serialization      ✅  ByteWriter/ByteReader (LEB128 varints, strings, vec3)
│   ├── snapshots          ✅  SnapshotBuffer entity interpolation
│   ├── replication        ✅  field-level numeric delta (diff/apply)
│   ├── prediction         ✅  Predictor: local predict of unacked inputs
│   └── reconciliation     ✅  Predictor.reconcile: adopt authoritative state + replay
│
├── 08 Tools
│   ├── asset pipeline     🟡  a bespoke GLB parser exists in apps/client/earth/model.ts
│   ├── editor             ⬜
│   ├── profiler           ⬜
│   └── debugging          ⬜
│
└── 09 Scientific / Specialized
    ├── astronomy          ⬜
    ├── orbital mechanics  ⬜  PLAN: Kepler propagator reusing crates/num-rs; relates to orbit-trust
    ├── robotics           ⬜  relates to TerraSight (SLAM, stereo depth, rover)
    └── simulation         ⬜
```

## Conventions

- **Category folders** (`packages/NN-name/<module>`) are for organisation only.
  Package *names* stay flat (`@engine/math`, `@engine/core`, …) so imports never
  depend on where a module sits in the tree.
- **Rust** modules live under `crates/` and build with `cargo`; they map into the
  same categories (e.g. `num-rs` → 01 Foundation / numerics).
- A module graduates from 🟡 to its own package only when it has enough surface to
  justify one — not before.

## Decided-but-not-yet-built

- **terrain** → port TerraSight's terrain-analysis approach (not procedural-first).
- **orbital mechanics** → build in a scientific module reusing `crates/num-rs`;
  the orbital collision-probability `Pc` stays in the separate `orbit-trust` repo.
