import { defineConfig } from "vite";

// Serve the workspace engine packages as source (they export .ts) instead of
// letting esbuild pre-bundle a stale copy.
export default defineConfig({
  server: { host: true },
  optimizeDeps: { exclude: ["@engine/math", "@engine/physics"] },
});
