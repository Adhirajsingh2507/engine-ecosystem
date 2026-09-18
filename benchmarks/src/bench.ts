/**
 * Tiny dependency-free micro-benchmark harness. Warms up, then times fixed-size
 * batches until a target wall-clock budget elapses, and reports ops/sec.
 * Not a statistical rig — a quick, honest relative signal (add tinybench/mitata
 * if you need distributions).
 */
export interface BenchResult {
  name: string;
  opsPerSec: number;
  iterations: number;
}

export function bench(name: string, fn: () => void, budgetMs = 500): BenchResult {
  // warmup
  for (let i = 0; i < 1000; i++) fn();

  let iterations = 0;
  const batch = 1000;
  const start = performance.now();
  let elapsed = 0;
  while (elapsed < budgetMs) {
    for (let i = 0; i < batch; i++) fn();
    iterations += batch;
    elapsed = performance.now() - start;
  }
  const opsPerSec = (iterations / elapsed) * 1000;
  return { name, opsPerSec, iterations };
}

export function report(results: BenchResult[]): void {
  const pad = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    const ops = r.opsPerSec >= 1e6
      ? `${(r.opsPerSec / 1e6).toFixed(2)}M ops/s`
      : r.opsPerSec >= 1e3
        ? `${(r.opsPerSec / 1e3).toFixed(1)}K ops/s`
        : `${r.opsPerSec.toFixed(0)} ops/s`;
    console.log(`  ${r.name.padEnd(pad)}  ${ops.padStart(14)}`);
  }
}
