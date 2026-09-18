# Vision — a reusable engine ecosystem

The point is **not** "build a game engine." It's to build a **layered set of
reusable libraries** — math below physics, physics below the engine, the engine
below the games — and to **share the same simulation code between the browser
client and the Node server**. TypeScript compiles to both, so shared code is
free (no bindings, no WASM).

Guiding rule: **every new game should need less engine-level code than the last.**
That's the proof the abstraction is real.

## Layered architecture

```
                        GAME / APPLICATION
                              │
                ┌─────────────┴─────────────┐
           Client / Frontend           Server / Backend
                │                           │
                └───────────── shared ──────┘
                              │
                       GAME ENGINE CORE
              ECS · scene graph · events · resources
              serialization · networking interfaces
                              │
              ┌───────────────┼───────────────┐
           Math            Physics          Networking
        Vec/Mat/Quat    collision/solver   protocol/state/RPC
        geometry        rigid body         replication/sync
```

Math sits at the bottom. Physics and the renderer depend on math. The engine
depends on math + physics. Games depend on the engine. Client and server both
consume the **same** shared packages.

## Packages (build order, each usable on its own)

### 1. `math-core`  — *in progress*
- Linear algebra: `Vec2/3/4`, `Mat2/3/4`, `Quaternion`, `Transform`,
  eigen/decompositions later.
- Geometry: `Ray`, `Plane`, `Sphere`, `AABB`, `OBB`, `Capsule`, `Triangle`,
  `Frustum`; closest-point + intersection tests (ray-sphere, ray-AABB,
  sphere-sphere, triangle-ray, frustum-AABB, …).
- Numerical: integration, root finding, interpolation, Bézier/splines,
  float-error handling.
- Procedural: Perlin/Simplex noise, fBm, Voronoi, random distributions.

### 2. `physics-core` (depends on math)
- Rigid bodies: position, orientation, linear/angular velocity, mass,
  inverse-mass, inertia tensor, force/torque accumulation.
- Pipeline: **broad phase → narrow phase → contact generation → constraint
  solver → integration.**
- Collision: AABB broadphase → BVH / spatial hash → GJK → EPA → SAT → contact
  manifold → impulse/constraint solver.
- Later: friction, restitution, constraints, soft bodies, cloth, rope, vehicles,
  particles, destruction.

### 3. Spatial data structures (shared)
- Octree, Quadtree, BVH, KD-tree, uniform grid, spatial hash, R-tree.
- Reused by physics, ray casting, visibility, AI, pathfinding, world queries,
  network interest management.

### 4. `engine-core` — ECS (depends on math, physics)
- Entities, components (`Transform`, `RigidBody`, `Collider`, `Mesh`, `Camera`,
  `Health`, `Weapon`, …), systems (`Physics`, `Render`, `Animation`, `AI`,
  `Audio`, `Network`).
- Scene graph, events/messaging, resource management, scripting, serialization.
- Data-oriented later: archetypes, chunk storage, SoA, cache-aware iteration,
  job scheduling.

### 5. `renderer-core` (depends on math)
- GPU abstraction, command buffers, meshes, textures, materials, shaders,
  camera, lighting, shadow mapping, frustum culling, LOD, post FX.
- Techniques progression: forward → deferred → forward+ → PBR → HDR → cascaded
  shadows → IBL → SSR → SSAO → bloom → TAA → GPU particles → (ray/path tracing,
  compute, GPU-driven).
- Web target = WebGL2/WebGPU; keep the backend swappable.

### 6. `net-core` (networking)
- Packet serialization, compression, encryption, reliability, channels, RPC.
- Replication, snapshots, interpolation, **client prediction + server
  reconciliation**, lag compensation.

### 7. Cross-cutting engine systems
- **Animation:** skeleton, keyframes, clips, blending, layers, IK, state machine,
  motion matching, procedural.
- **AI:** FSM, behavior trees, utility AI, GOAP, steering, pathfinding, nav mesh,
  perception, squad AI.
- **Jobs / threading:** thread pool, job queue, work stealing, task graph
  (Web Workers on the client; worker threads on the server).
- **Memory:** arena / pool / stack / linear / frame allocators, allocation
  tracking (relevant even in JS for pooling hot objects like `Vec3`/contacts).
- **Asset pipeline:** importers (glTF/obj/png/wav), shader/material compilers,
  asset DB, dependency tracking, hot reload.
- **Serialization:** JSON + compact binary; reused for saves, packets, config,
  scenes, replays, asset metadata. Shared client/server.

## Client vs server

Server is authoritative. Client predicts and reconciles.

```
CLIENT                          SERVER
input → prediction              input → authoritative physics
      → local physics                 → game state
      → render                        → snapshots ──► clients

client predicts 100.0 ; server says 99.7 ; client reconciles → 99.7, keep predicting
```

Both sides share the **same data model** (`Transform`, `RigidBody`,
`CollisionShape`, `Entity`, `Component`, `GameState`) — the client feeds it to
the renderer, the server feeds it to physics + replication.

## Determinism (stretch goal)

`same input + same initial state → same result`. Enables lockstep multiplayer,
rollback netcode, replays, and simulation verification. Watch floating-point
determinism carefully (fixed timestep, careful op ordering, avoid transcendental
divergence across platforms).

## Backend infrastructure (reusable services)

Auth, sessions, lobby, matchmaking, game server, persistence, leaderboards,
inventory, profiles, telemetry, analytics, admin API. Persistence behind a
repository interface (Postgres / Redis swappable). Observability: logging,
metrics, tracing, health checks, rate limiting, circuit breakers. Security:
**treat the client as untrusted** — validation, replay protection, anti-cheat
primitives, secure serialization.

## Tooling

- **Editor:** scene/entity/component inspectors, material + animation editors,
  physics debugger, profiler, console, asset browser, level tools.
- **Dev tools:** logger, CPU/GPU/memory profilers, frame debugger, physics +
  network visualizers, performance counters, crash reporter.
- **Testing / benchmarking:** unit + integration + determinism + stress tests;
  benchmark harness comparing AoS vs SoA, BVH vs octree, allocators, collision
  algorithms.
- **Replay:** record inputs + events + seeds → deterministic re-simulation for
  debugging, demos, and regression tests.

## Validation games (prove reuse)

1. **3D physics sandbox** — math, physics, renderer, ECS.
2. **Racing** — vehicles, AI, networking, terrain, audio.
3. **Multiplayer FPS** — prediction, replication, animation, server architecture.
4. **RTS** — thousands of entities, pathfinding, deterministic sim.
5. **Procedural open world** — streaming, LOD, world-gen, jobs.

## Highest-value order for systems depth

**Math → Physics → ECS → memory/pooling → job system → renderer → networking →
deterministic sim → multiplayer server → asset pipeline → editor → observability.**

---
*Distilled from the project's founding design notes. This is direction, not a
commitment to build every box — each package earns its place when a game needs it.*
