# engine — a reusable game-engine ecosystem

Not "a game engine." A **layered set of libraries** where math sits below
physics, physics below the engine (ECS/scene), and the engine below the games —
and where **the browser client and the Node server share the same simulation
code** (TypeScript compiles to both, no bindings). A small dependency-free Rust
numerics crate (`crates/num-rs`) rides alongside for CPU-heavy math.

> The goal: every new game should need *less* engine code than the last. That's
> the proof the abstraction is real.

## Dependency graph

```
                games/*  (validation projects)
                   │
             gameplay framework
                   │
        ┌──────────┼──────────┐
     apps/client            apps/server
     (WebGL, input,         (authoritative sim,
      prediction)            networking, persistence)
        └──────────┼──────────┘
                   │
            packages/engine   (ECS · scene · events · serialization)
                   │
        ┌──────────┼──────────┐
   packages/physics      packages/net
   (collision, rigid-      (protocol, replication,
    body, solver)           prediction, snapshots)
        └──────────┼──────────┘
                   │
            packages/math   ← the bottom rung (built)
       (Vec3 · Mat4 · Quaternion · geometry · noise)
```

## Layout (grows as filled — no empty scaffolding)

```
packages/   shared code, runs on client AND server (TypeScript)
  math/       ✅ 3D: Vec3/Vec4 · Mat3/Mat4 · Quaternion · Transform · geometry+intersections
              ✅ 2D: Vec2 · Transform2D · Circle/Aabb2/Ray2 + intersections (71 tests)
  physics/    ✅ RigidBody (scalar OR full Mat3 inertia tensor) · World with the collision
              pass wired in (broadphase → narrowphase → impulse solver) · sphere/box
              contacts incl. box↔box · restitution + Coulomb friction (47 tests)
  ecs/        ✅ Registry (entities + component stores + typed query) · SceneNode graph ·
              Signal event channel · Scheduler/System (6 tests)
  net/        ⬜ serialization · replication · prediction · reconciliation
crates/     Rust (built with cargo, reusable outside JS)
  num-rs/     ✅ Gauss-Legendre quadrature · 3×3 linalg — extracted from orbit_core (6 tests)
apps/
  client/     🟡 Cinematic WebGL2 engine (Vite) — PBR · PCF shadow maps · HDR+bloom · ACES,
              live physics sandbox + interactive GPU-raytraced Earth
  server/     🟡 Offline path tracer — GI · soft shadows · metals · depth of field → PNG
games/        ⬜ sandbox → racing → FPS → RTS → open world
```

## Roadmap (start small, each step is usable on its own)

`Vec3 → Mat4 → Quaternion → Transform → geometry/intersections`
` → RigidBody → collision (broad/narrow/solver) → ECS → renderer`
` → networking → deterministic sim → authoritative server → games`

Highest-value order for systems depth:
**Math → Physics → ECS → memory/pooling → job system → renderer →
networking → deterministic sim → multiplayer server → asset pipeline → editor.**

Full design notes and the long-form vision live in `docs/vision.md`.

## Run

```bash
pnpm install     # once: links workspace packages + installs tsc / @types/node
pnpm check       # typecheck + tests (CI gate)
pnpm test        # tests only
pnpm typecheck   # types only

# Rust numerics crate
cargo test --manifest-path crates/num-rs/Cargo.toml
```

## Garuda devotional render

The offline renderer includes a procedural white-and-gold Garuda with layered
wings, jewelry, a devotional flight pose, and a removable Vishnu rider. It uses
the engine's triangle mesh and BVH path rather than an imported image or model.

```bash
# Fast composition preview
pnpm --filter server render 640 360 16 5 garuda-preview.png --scene garuda

# Final Full HD frontend asset
pnpm --filter server render 1920 1080 12 5 ../client/public/garuda.png --scene garuda

# Open /?mode=viewer for Garuda; / remains the physics sandbox
pnpm --filter client dev
```

`buildGaruda()` includes Vishnu for the reference-inspired hero scene. Pass
`{ includeVishnu: false }` to reuse Garuda alone in another composition.

Node ≥ 22 runs the `.ts` sources directly via type-stripping — **no build
step**. Packages import each other's source (`@engine/math` → its `src`), and
`tsc` runs as a pure checker (`noEmit`), never a compiler. When a package is
eventually published to npm, add a build step then — not before.
```
