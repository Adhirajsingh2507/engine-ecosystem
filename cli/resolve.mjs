// Dependency resolution — pure. Policy: FAIL IF MISSING. We never auto-add a
// dependency; a package can only be vendored if each of its @engine/* deps is
// either already present at the destination or named in the same command.

/** Resolve input aliases (short or full) to canonical package names. */
export function resolveNames(inputs, aliases) {
  const resolved = [];
  const unknown = [];
  for (const input of inputs) {
    const pkg = aliases.get(input);
    if (pkg) resolved.push(pkg.name);
    else unknown.push(input);
  }
  return { resolved, unknown };
}

/**
 * Which selected packages have unmet dependencies.
 * @param selected canonical names being added now
 * @param present  canonical names already vendored at the destination
 * @returns array of { name, missing: string[] } (empty = all satisfied)
 */
export function missingDeps(selected, present, registryByName) {
  const satisfied = new Set([...selected, ...present]);
  const problems = [];
  for (const name of selected) {
    const pkg = registryByName.get(name);
    if (!pkg) continue;
    const missing = pkg.deps.filter((d) => !satisfied.has(d));
    if (missing.length > 0) problems.push({ name, missing });
  }
  return problems;
}
