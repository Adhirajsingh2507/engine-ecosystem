# engine-ecosystem

A reusable game-engine ecosystem: a **layered set of libraries** where math sits
below physics, physics below the runtime (ECS/scene/engine), and the runtime below
rendering and games — and where the **browser client and the Node server share the
same code** (TypeScript compiles to both, no bindings). A small dependency-free
Rust crate (`crates/num-rs`) rides alongside for CPU-heavy numerics.

> Goal: every new game needs *less* engine code than the last. That's the proof
> the abstraction is real.

Package names stay flat (`@engine/math`, `@engine/physics`, …) while the folders
group them into numbered layers. The full target architecture and status live in
[`ROADMAP.md`](./ROADMAP.md); the design rationale in [`docs/architecture.md`](./docs/architecture.md).

## Layout

```
packages/                       shared TypeScript, runs on client AND server
  01-foundation/
    math/       @engine/math            Vec2/3/4 · Mat3/4 · Quaternion · Transform/2D
    geometry/   @engine/geometry        Ray/Aabb/Sphere/Triangle + 2D + intersections · BVH · TriMesh
    core/       @engine/core            deterministic Rng · interpolation/easing · FixedTimestep
  02-simulation/
    physics/    @engine/physics         RigidBody (scalar or Mat3 inertia) · World collision pass
                                        (broad→narrow→solver) · restitution + friction
    ecs/        @engine/ecs             Registry + typed query · SceneNode graph · Signal · Scheduler
  03-runtime/
    engine/     @engine/engine          Engine: Registry + Scheduler + FixedTimestep + scene + render hook
  04-rendering/
    render-core/ @engine/render-core    backend seam + render graph · PBR materials · lighting/shadow math · colour
    webgl2/     @engine/render-webgl2   WebGL2 forward renderer (a render-core backend): PBR · shadows · bloom · ACES
  05-world/
    world/      @engine/world           value noise + FBM · Heightmap (slope/roughness/traversability) → mesh
  06-gameplay/
    gameplay/   @engine/gameplay        keyframe animation · grid A* + steering · behaviour trees
  07-networking/
    net/        @engine/net             binary (de)serialization · snapshot interp · prediction + reconciliation · deltas
  08-tools/
    tools/      @engine/tools           headless GLB loader · sectioned Profiler · DebugDraw buffer
  09-scientific/
    scientific/ @engine/scientific      Kepler orbital propagator · Julian date/GMST · RK4 · planar FK
crates/                         Rust (cargo), reusable outside JS
  num-rs/                       Gauss-Legendre quadrature · 3×3 linalg
apps/                           thin consumers of the packages above
  client/                       Vite WebGL2 physics sandbox (+ a GPU-raytraced Earth module)
  server/                       offline Monte-Carlo path tracer → PNG
examples/                       small runnable programs that consume the engine
benchmarks/                     dependency-free micro-benchmarks
```

**Stability** is declared per package (`"stability"` in each `package.json`):
`stable` = math, geometry, core, physics, ecs, num-rs · `experimental` = engine,
render-core, render-webgl2, world, gameplay, net, tools, scientific · everything
else in the tree is `planned` (see `ROADMAP.md`).

## Installation (from scratch)

**Prerequisites**

| Tool | Version | Why |
|------|---------|-----|
| [Node.js](https://nodejs.org) | **≥ 22** | runs the `.ts` sources directly (type-stripping) — no build step |
| [pnpm](https://pnpm.io) | **9.x** | workspace package manager |
| [Rust](https://rustup.rs) + cargo | stable | only for the `crates/num-rs` numerics crate (optional) |

```bash
# 1. Get the code
git clone git@github.com:Adhirajsingh2507/engine-ecosystem.git
cd engine-ecosystem

# 2. Install pnpm if you don't have it (either works)
npm install -g pnpm        # or:  corepack enable && corepack prepare pnpm@9 --activate

# 3. Install workspace dependencies (links all @engine/* packages together)
pnpm install

# 4. Verify everything works
pnpm check                                              # typecheck + all TS tests + app tests
cargo test --manifest-path crates/num-rs/Cargo.toml     # Rust tests (skip if no Rust)
```

If `pnpm check` prints test summaries with `# fail 0`, you're set.

## Commands

```bash
pnpm check            # full gate: tsc + apps tsc + package tests + server tests
pnpm test             # package unit tests only
pnpm typecheck        # types only (packages, examples, benchmarks)
pnpm test:rust        # cargo test for num-rs

# apps (from repo root)
pnpm --filter client dev                       # WebGL2 physics sandbox at http://localhost:5173
pnpm --filter server render 640 360 64 6 out.png   # offline path trace → out.png
#                          W   H  spp depth

# examples & benchmarks
pnpm --filter @engine/examples bounce          # physics: spheres on a box floor
pnpm --filter @engine/examples ecs             # runtime: ECS movement via Engine loop
pnpm --filter @engine/benchmarks all           # math + physics micro-benchmarks
```

## Using a package in your own code

```ts
import { Vec3 } from "@engine/math";
import { World, RigidBody } from "@engine/physics";

const world = new World(new Vec3(0, -9.81, 0), { restitution: 0.5 });
world.add(new RigidBody({ mass: 1, position: new Vec3(0, 5, 0), collider: { kind: "sphere", radius: 0.5 } }));
world.step(1 / 60);
```

See [`examples/`](./examples) for complete, runnable programs.

## No build step

Node ≥ 22 runs the `.ts` sources directly via type-stripping. Packages import each
other's source (`@engine/math` → its `src/`), and `tsc` runs as a pure checker
(`noEmit`), never a compiler. Add a build step only when publishing a package to
npm — not before.

Because types are stripped rather than compiled, a few TypeScript features are off
limits (`enum`, parameter properties, …). Contributing rules — strip-safe syntax,
the headless-test requirement, and the deferred-not-stubbed policy — are in
[`docs/conventions.md`](./docs/conventions.md); the layer/dependency model is in
[`docs/architecture.md`](./docs/architecture.md).
