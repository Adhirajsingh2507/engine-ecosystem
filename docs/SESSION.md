# Session handoff — 3d-game engine ecosystem

Everything important from the build session, so work can resume cold.
Date: 2026-09-11 · Workspace: `/home/adhiraj-singh/gdg/devx`

---

## 1. What exists now

A TypeScript monorepo, `devx/3d-game/`, building a **reusable engine ecosystem**
where one shared core (math + physics) is consumed by **two renderers** — a
real-time WebGL client and an offline path tracer — proving the "same code,
frontend and backend" thesis.

```
3d-game/
  packages/
    math/      Vec3 · Mat4 · Quaternion · Transform · geometry (Ray/Aabb/Sphere) + intersections
    physics/   RigidBody (linear+angular) · World · SpatialHash broadphase · contacts · impulse solver
  apps/
    client/    Cinematic WebGL2 engine (Vite): PBR · PCF shadows · HDR+bloom · ACES tonemap
    server/    Offline path tracer: GI · soft shadows · metals · DoF → PNG (node:zlib encoder)
  docs/        vision.md (long-form roadmap) · SESSION.md (this file)
```

### Status: **99 tests + all 4 typechecks green**
- packages: 91 tests (`pnpm test`) + typecheck (`pnpm typecheck`)
- server: 8 tests (`pnpm --filter server test`)
- client + server typecheck via their own `tsconfig.json` (DOM/node libs)
- Both renderers browser/headless-verified (see §6).

---

## 2. How to run

```bash
cd 3d-game
pnpm install                       # links workspace pkgs + tsc/@types/node/vite
pnpm check                         # packages: typecheck + tests (the CI gate)

pnpm --filter client dev           # real-time cinematic sandbox (WebGL2)
pnpm --filter server render 800 450 220 6 out.png   # offline path trace → PNG
```

- Tests run via **Node type-stripping** (`node --test`), no build step.
- `tsc` runs as a **pure checker** (`noEmit`) — the project never compiles to JS;
  packages import each other's `src` directly (`@engine/math` → its `src/index.ts`).
- Path-tracer args: `[width] [height] [spp] [depth] [out.png]` (defaults 640×360×64, depth 6).

---

## 3. Architecture & conventions (don't break these)

- **Math is immutable value types** (Vec3/Mat4/Quaternion/Transform return new
  instances). Physics bodies are **mutable** (a body IS its evolving state).
- **Matrices are column-major, right-handed, clip z ∈ [-1,1]** (gl-matrix / WebGL
  convention) — so `Mat4` drops straight into `gl.uniformMatrix4fv(..., false, ...)`.
- **Quaternion (x,y,z,w)**, w = scalar. `rotate()` assumes unit; `slerp` short-path.
- **Contact normal points a→b**; `resolveContact(a,b,contact,restitution)` moves
  `a` along `-normal`, `b` along `+normal`. Solver is **linear-only** (no friction/
  angular contact yet).
- **Broadphase is conservative**: `SpatialHash.pairs()` returns a *superset* of real
  overlaps (no false negatives) — always confirm with `aabbAabb`/narrow-phase.
- **Config**: `tsconfig.base.json` has `noEmit`, `allowImportingTsExtensions`,
  `verbatimModuleSyntax` (so `import type` is enforced — required for Node
  type-stripping to strip type-only imports). All source uses **explicit `.ts`
  import extensions** — needed at runtime; don't remove them.
- **No new deps unless needed** (ponytail). Current deps: vite (client), typescript
  + @types/node (dev). PNG encoding uses `node:zlib` (no image lib).

---

## 4. Git state

- Repo root: **`/home/adhiraj-singh/gdg/devx`** (a standalone git repo `git init`'d
  this session, remote `origin` = `github.com/Adhirajsingh2507/devx`, **private**).
  - The parent `gdg` folder is a *different* repo (`can-i-actually-apply`) — untouched.
- **The devx repo has commits that are LOCAL ONLY** (user chose not to push).
  Run `git push` from `devx/` when ready. Commit chain (newest first):
  ```
  8679dec client: cinematic graphics engine (PBR, shadows, bloom, ACES)
  288c7bd backend offline path tracer (apps/server)
  bc03b50 mark WebGL client built in README status
  dd415e5 WebGL client that renders the live physics world
  6bbded6 physics: narrow-phase contacts + impulse solver
  808e49e physics: angular dynamics + spatial-hash broadphase
  94fc011 make typecheck actually work (tsc as pure checker)
  10d3ac5 add Transform (TRS) to math-core
  f3cde0e math + physics (RigidBody/World)
  88e28ae Initial commit: devx workspace
  ```
- Ignored: `node_modules/`, `dist/`, `*.tsbuildinfo`, `apps/server/*.png`,
  `.env`/`.env.local` (secrets never committed — verified).
- Commit attribution in use:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` + `Claude-Session:` line.

---

## 5. MCP / environment (workspace-level, separate from 3d-game)

- Active MCP config: `devx/.mcp.json`. **github** and **postgres** MCP servers
  fail to connect because `${GITHUB_PAT}` and `${DATABASE_URL}` env vars aren't set.
- Fix created: `devx/.env` (gitignored) holds `GITHUB_PAT` (filled from `gh auth
  token`) and `DATABASE_URL` (still empty — user is providing it; postgres kept).
  A running session can't pick up new env — must relaunch:
  ```bash
  set -a; source .env; set +a; claude --continue
  ```
- `gh` CLI is authenticated (`Adhirajsingh2507`), so repo ops work without the MCP.
- **Security note:** the `gho_` token rendered in plaintext in the session transcript;
  rotate it (`gh auth refresh`) if that transcript isn't private.
- Neon + Supabase MCP already cover DB needs (postgres MCP is redundant unless a
  raw `DATABASE_URL` is wanted).

---

## 6. Verification done this session

- **Path tracer**: rendered 800×450 @ 220spp in 91s; valid PNG; visually confirmed
  (metals reflecting, soft GI shadows, DoF, dusk sky). Image sent to user.
- **Cinematic client**: headless Chromium (Playwright) — `glError: 0`, HDR float
  pipeline active, 60fps, 0 console errors; screenshot confirmed PBR spheres, PCF
  soft shadows, bloom, vignette. Image sent to user.
- Exposed + fixed a real physics issue: the **frictionless** floor let bodies slide
  off-screen forever → added an invisible pen + per-step drag in the client demo.

---

## 7. Known limitations (documented in code) & next rungs

- **Physics solver**: linear impulse only — no friction, no torque from off-centre
  hits. Next: apply impulse at `contact.point` through an inertia **tensor** (needs
  a `Mat3` — same `Mat3` upgrades RigidBody's current scalar/isotropic inertia).
- **Path tracer**: single-threaded, cosine-sampled (no NEE) → visible grain. Next:
  `worker_threads` over row-bands + next-event estimation toward the light.
- **Client PBR**: hemisphere ambient (not true IBL); single-cascade shadow map.
- **Not built yet**: `engine/` ECS package, `net/` package, an authoritative server
  running the same `World` headless (the multiplayer thesis), the `games/`.
- Roadmap order (from `docs/vision.md`): Math → Physics → **ECS** → memory/pooling →
  jobs → renderer → networking → deterministic sim → multiplayer server → games.

---

## 8. Session environment notes

- Node **v25** (native `.ts` type-stripping; flag kept for Node 22 portability).
- pnpm **9.15**. Playwright MCP is local (`npx @playwright/mcp`); its screenshots
  land in the MCP server's cwd (`devx/`), so delete strays after (done this session).
- Ponytail mode active (lazy-but-correct: smallest working diff, stdlib first,
  one runnable check per non-trivial unit).
