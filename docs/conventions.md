# Conventions

Durable rules for contributing to this repo. They exist because the project runs
TypeScript with **no build step**, and because we keep the module tree honest.

## 1. Strip-only TypeScript (no build step)

Node ≥ 22 runs `.ts` files by **stripping** type annotations and executing the
JavaScript that remains. `tsc` runs only as a checker (`noEmit`). This is fast and
binding-free, but it works **only when a file becomes valid JS by *deleting* type
syntax** — never by rewriting it.

So anything that emits runtime code is banned, because stripping can't generate it:

| ❌ Not allowed | Why it breaks | ✅ Use instead |
|----------------|---------------|----------------|
| `enum Foo {}` | compiles to a runtime IIFE/object | `const Foo = { A: "a" } as const;` + `type Foo = (typeof Foo)[keyof typeof Foo];` |
| Parameter properties — `constructor(private x: T){}` | silently generates `this.x = x` | declare the field, then assign in the body: `private x: T; constructor(x: T){ this.x = x; }` |
| `namespace` with runtime members | emits a runtime object | a module file with plain exports |
| Legacy/experimental decorators | emit runtime calls | plain functions / explicit wiring |

**Allowed and encouraged** (all erase cleanly): `interface`, `type`, generics,
`as`, `satisfies`, `import type` / `export type`, `declare`. Types are still fully
enforced by `tsc` — they just never compile to anything.

Node's error when you slip up is explicit, e.g.
`SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode`.
`pnpm test` catches it because a test file that imports the offending module fails
to load.

> A build step (and therefore enums, etc.) is only introduced **per package when it
> is published to npm** — not before.

## 2. Every module ships a runnable test

Non-trivial logic leaves behind at least one test in the package's `test/`, run by
`node --test` via `pnpm test`. Tests must be **runnable headless** — no browser, no
GPU, no network. If a feature can't be verified headless (e.g. Web Audio, live
WebGL rendering), it is **deferred**, not committed untested.

## 3. Deferred, not stubbed

A module that isn't built yet is **recorded in `ROADMAP.md` with `⬜`** and left out
of the tree entirely. We do **not** create empty packages, placeholder folders, or
`throw "not implemented"` stubs — they clutter imports, rot, and misrepresent what
works. The tree grows only as modules are genuinely filled.

A module graduates to its own package only when it has enough surface to justify
one; until then it may live inside a related package (tracked as `🟡` in the roadmap).

## 4. Category folders vs package names

Modules live under numbered category folders (`packages/NN-category/<name>`), but
each package's **name is flat** (`@engine/<name>`). Imports resolve by name through
the pnpm workspace, so moving a package between category folders never changes an
import. See [`architecture.md`](./architecture.md) for the layer/dependency rules.
