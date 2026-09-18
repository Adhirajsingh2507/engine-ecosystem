# Roadmap

The target architecture, organised into 8 layered categories. Status is honest:
built code only — **no empty stub packages** (the repo grows as modules are filled).

Legend: ✅ built & tested · 🟡 partial / lives elsewhere in the tree · ⬜ planned

```
engine-ecosystem
│
├── 01 Foundation
│   ├── math               ✅  packages/01-foundation/math  (Vec2/3/4, Mat3/4, Quaternion, Transform/2D)
│   ├── geometry           🟡  currently inside math (Ray/Aabb/Sphere/Triangle + 2D + intersections);
│   │                          split into @engine/geometry only if it earns its own package
│   ├── numerics           ✅  crates/num-rs (Rust: Gauss-Legendre quadrature, 3×3 linalg)
│   └── core               ✅  packages/01-foundation/core  (Rng, interpolation/easing, FixedTimestep)
│
├── 02 Simulation
│   ├── physics            ✅  packages/02-simulation/physics  (RigidBody, World, contacts, solver)
│   ├── ECS                ✅  packages/02-simulation/ecs  (Registry, query, Scheduler, Signal)
│   ├── scene              🟡  SceneNode graph lives in ecs; promote to its own module if it grows
│   ├── collision          🟡  broad/narrow phase + solver live in physics
│   └── spatial            🟡  SpatialHash lives in physics; generalise to grid + BVH → own module
│
├── 03 Rendering
│   ├── render-core        ⬜  device/pipeline/target abstraction (extract from apps/client)
│   ├── WebGL2             ✅  apps/client  (PBR, PCF shadows, HDR bloom, ACES) — to be extracted into a package
│   ├── WebGPU             ⬜  parallel backend behind render-core
│   ├── render graph       ⬜  pass scheduling / resource aliasing
│   ├── materials          ⬜  material/shader system
│   ├── lighting           ⬜  light types, shadow atlas, GI
│   └── ray tracing        🟡  offline path tracer (apps/server) + GPU Earth raytracer (apps/client/earth)
│
├── 04 World
│   ├── terrain            ⬜  PLAN: port TerraSight terrain-analysis (slope/roughness/traversability),
│   │                          then heightmap → mesh
│   ├── procedural gen     ⬜  noise (value/simplex/FBM), builds on core.Rng
│   ├── water              ⬜
│   ├── atmosphere         🟡  scattering shell exists in the GPU Earth shader; generalise later
│   └── streaming          ⬜  chunked load/unload, LOD
│
├── 05 Gameplay
│   ├── animation          ⬜  clips, skinning, state machines (builds on core.easing + math)
│   ├── audio              ⬜
│   ├── navigation         ⬜  navmesh + pathfinding
│   └── AI                 ⬜  behaviour trees / steering
│
├── 06 Networking
│   ├── serialization      ⬜
│   ├── snapshots          ⬜
│   ├── replication        ⬜
│   ├── prediction         ⬜
│   └── reconciliation     ⬜
│
├── 07 Tools
│   ├── asset pipeline     🟡  a bespoke GLB parser exists in apps/client/earth/model.ts
│   ├── editor             ⬜
│   ├── profiler           ⬜
│   └── debugging          ⬜
│
└── 08 Scientific / Specialized
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
