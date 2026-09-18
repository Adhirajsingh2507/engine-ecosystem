# benchmarks

Dependency-free micro-benchmarks for a quick relative signal (not a statistical
rig). Node ≥ 22 runs the TypeScript directly.

```bash
pnpm --filter @engine/benchmarks math      # Vec3 / Mat4 / Quaternion ops
pnpm --filter @engine/benchmarks physics   # World.step at 100 / 500 / 2000 bodies
pnpm --filter @engine/benchmarks all
```

Each bench warms up, then times batches against a wall-clock budget and reports
ops/sec. For distributions/variance, swap `src/bench.ts` for tinybench or mitata.
