# Changelog

All notable milestones for the engine-ecosystem. Dates are UTC. The project runs
with no build step (Node ≥ 22 strips types); see `docs/conventions.md`.

## Unreleased

### Added
- **Install CLI** — dependency-free, cross-platform Node CLI runnable via
  `npx github:Adhirajsingh2507/engine-ecosystem`. `list` browses packages by layer;
  `add <name…>` vendors a package's source into `./engine`. Dependency policy is
  **fail-if-missing** (deps are never auto-added). Interactive picker when no names
  are given.
- **09 Scientific** (`@engine/scientific`) — Kepler orbital propagator, Julian
  date / GMST, generic RK4 integrator, planar forward kinematics.
- **08 Tools** (`@engine/tools`) — headless GLB (glTF 2.0) geometry loader,
  sectioned Profiler with injectable clock, DebugDraw buffer.
- **07 Networking** (`@engine/net`) — binary serialization, snapshot interpolation,
  client prediction + reconciliation, field-level delta replication.
- **06 Gameplay** (`@engine/gameplay`) — keyframe animation, grid A* + steering,
  behaviour trees.
- **05 World** (`@engine/world`) — value noise + fractal FBM, heightmap terrain
  analysis (slope/roughness/traversability) and heightmap→mesh.
- **04 Rendering core** (`@engine/render-core`) — render graph (pass DAG +
  topological compile + resource lifetimes), PBR materials, lighting/shadow math,
  sRGB↔linear colour, and the backend device seam.
- **04 Rendering** (`@engine/render-webgl2`) — WebGL2 forward renderer extracted
  from the client (PBR, PCF shadows, HDR bloom, ACES). GPU-raytraced Earth viewer
  wired at `?mode=earth`.
- **03 Runtime** (`@engine/engine`) — the integrator (Registry + Scheduler +
  FixedTimestep + scene + backend-agnostic render callback).
- **02 Simulation** — `@engine/physics` (rigid bodies, collision pass wired into
  `World.step`, Mat3 inertia tensor, friction, box↔box) and `@engine/ecs`
  (registry + typed query, scene graph, signals, scheduler).
- **01 Foundation** — `@engine/math` (2D + 3D linear algebra), `@engine/geometry`
  (shapes, intersections, BVH, TriMesh — split out of math), `@engine/core`
  (deterministic RNG, interpolation/easing, fixed-timestep loop), and the Rust
  `crates/num-rs` (Gauss-Legendre quadrature + 3×3 linalg, extracted from
  orbit_core).
- **Tooling** — CI (`pnpm check` + `cargo test`), `examples/`, `benchmarks/`, and
  docs: `architecture.md`, `conventions.md`, `ROADMAP.md`.

### Changed
- Reorganised packages into numbered category folders (`packages/NN-layer/<name>`)
  while keeping flat `@engine/*` package names, so imports never depend on layout.
- Root package renamed `3d-game` → `engine-ecosystem`; repo made public.

### Removed
- The procedural Garuda model, its scene/test, the Garuda viewer page, and its asset.

### Notes
- Deferred (tracked in `ROADMAP.md`, not stubbed): WebGPU backend, World
  water/atmosphere/streaming, Gameplay audio, editor — each blocked on browser/GPU
  verification or scope.
