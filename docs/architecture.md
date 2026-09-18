# Architecture

## Principle: layered, one-directional dependencies

The ecosystem is a stack. Each layer may depend only on layers **below** it, never
sideways within its own concern and never upward. This keeps the foundation
reusable in isolation and prevents cycles.

```
        apps/ · examples/ · benchmarks/     (consumers — depend on packages, never depended on)
                     │
   04 rendering    @engine/render-webgl2
                     │
   03 runtime      @engine/engine           (integrates ECS + scene + fixed loop; render is a callback)
                     │
   02 simulation   @engine/physics   @engine/ecs
                     │
   01 foundation   @engine/geometry  ──▶ @engine/math      @engine/core
                                              (crates/num-rs — Rust, standalone)
```

Concretely:

- **`@engine/math`** — vectors, matrices, quaternions, transforms. Depends on nothing.
- **`@engine/geometry`** — shapes, ray/overlap tests, BVH, triangle meshes. Depends on `math`.
- **`@engine/core`** — RNG, interpolation/easing, fixed-timestep loop. Depends on nothing (deliberately no `math`, so it stays a pure utility layer).
- **`@engine/physics`** — rigid bodies, collision pipeline, solver. Depends on `math` + `geometry`.
- **`@engine/ecs`** — registry/query, scene graph, events, scheduler. Depends on `math`.
- **`@engine/engine`** — the runtime integrator. Depends on `ecs` + `core` + `math`.
- **`@engine/render-webgl2`** — WebGL2 forward renderer. Depends on `math`.
- **`crates/num-rs`** — Rust quadrature + 3×3 linalg. Standalone; maps to the foundation layer.

`apps/`, `examples/`, and `benchmarks/` are **consumers**: they import packages and
contain no reusable engine logic themselves. Nothing depends on them.

## Categories vs package names

Folders group packages into the numbered layers (`packages/01-foundation/math`), but
each package's **name** is flat (`@engine/math`). Imports resolve by name through the
pnpm workspace, so moving a package between category folders never changes a single
import. Category numbers order the layers; they are organisational, not part of any API.

## Stability policy

Every package declares `"stability"` in its `package.json`:

| Level | Meaning | Current |
|-------|---------|---------|
| `stable` | API unlikely to change; safe to build on | math, geometry, core, physics, ecs, num-rs |
| `experimental` | usable but the API may still move | engine, render-webgl2 |
| `planned` | not built yet — tracked in `ROADMAP.md`, no stub package | rendering (WebGPU, render-graph, …), world, gameplay, networking, tools, scientific |

A module graduates to its own package only when it has enough surface to justify one.
We do not scaffold empty folders.

## No build step

Node ≥ 22 strips types and runs the `.ts` sources directly. Packages point their
`main` at `src/index.ts`; `tsc` runs as a checker (`noEmit`). A build step is added
per package only when it is published to npm.

## Testing

- TypeScript: `node --test` with type-stripping. Package tests live in each
  package's `test/`; run via `pnpm test`. App tests via `pnpm test:server`.
- Rust: `cargo test` in `crates/num-rs`.
- `pnpm check` is the full gate (tsc + apps tsc + all TS tests) and is what CI runs,
  alongside `cargo test`.

## Adding a module

1. Decide its layer and drop it under `packages/NN-category/<name>/`.
2. `package.json`: name it `@engine/<name>`, set `"stability"`, and list only
   lower-layer `@engine/*` packages as dependencies.
3. Put code in `src/` (with a `src/index.ts` barrel) and tests in `test/`.
4. `pnpm install` to link it, then `pnpm check`.
5. Update `ROADMAP.md` status.
