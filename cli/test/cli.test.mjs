import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { scanRegistry, aliasMap } from "../registry.mjs";
import { resolveNames, missingDeps } from "../resolve.mjs";

const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url)))); // cli/test → repo root
const registry = scanRegistry(REPO_ROOT);
const byName = new Map(registry.map((p) => [p.name, p]));

test("registry discovers the known packages with deps", () => {
  const math = registry.find((p) => p.name === "@engine/math");
  const physics = registry.find((p) => p.name === "@engine/physics");
  assert.ok(math && math.deps.length === 0, "math has no @engine deps");
  assert.ok(physics, "physics present");
  assert.deepEqual([...physics.deps].sort(), ["@engine/geometry", "@engine/math"]);
  assert.ok(registry.some((p) => p.kind === "rust" && p.name === "num-rs"), "rust crate listed");
  assert.ok(registry.length >= 13);
});

test("aliases accept short and full names", () => {
  const aliases = aliasMap(registry);
  const { resolved, unknown } = resolveNames(["physics", "@engine/math", "nope"], aliases);
  assert.deepEqual(resolved.sort(), ["@engine/math", "@engine/physics"]);
  assert.deepEqual(unknown, ["nope"]);
});

test("fail-if-missing: physics alone reports math + geometry missing", () => {
  const problems = missingDeps(["@engine/physics"], [], byName);
  assert.equal(problems.length, 1);
  assert.deepEqual(problems[0].missing.sort(), ["@engine/geometry", "@engine/math"]);
});

test("deps satisfied when named together or already present", () => {
  assert.equal(missingDeps(["@engine/physics", "@engine/math", "@engine/geometry"], [], byName).length, 0);
  assert.equal(missingDeps(["@engine/physics"], ["@engine/math", "@engine/geometry"], byName).length, 0);
});

test("a dependency-free package needs nothing", () => {
  assert.equal(missingDeps(["@engine/core"], [], byName).length, 0);
});
