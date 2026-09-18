# examples

Small, headless programs that consume the engine packages the way a real app
would. Run with pnpm (Node ≥ 22 strips the TypeScript, no build step):

```bash
pnpm --filter @engine/examples bounce   # physics: spheres settling on a box floor
pnpm --filter @engine/examples ecs      # runtime: ECS movement via Engine's fixed-step loop
```

- **bouncing-spheres.ts** — `@engine/physics` `World` with gravity, a static box
  floor, and dynamic spheres; steps the sim and prints heights over time.
- **ecs-engine.ts** — `@engine/engine` `Engine` driving an ECS movement system,
  showing deterministic fixed steps under variable frame pacing.
