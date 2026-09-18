// Filesystem side of vendoring — copy a package's source into the user's project.
import { cpSync, mkdirSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Short folder name a package is vendored under (drops the @engine/ scope). */
export function vendorFolder(pkg) {
  return pkg.kind === "rust" ? pkg.name : pkg.name.replace(/^@engine\//, "");
}

/** Canonical names already vendored in `destDir` (reads their manifests). */
export function presentPackages(destDir) {
  if (!existsSync(destDir) || !statSync(destDir).isDirectory()) return [];
  const names = [];
  for (const entry of readdirSync(destDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pj = join(destDir, entry.name, "package.json");
    if (existsSync(pj)) {
      try { names.push(JSON.parse(readFileSync(pj, "utf8")).name); } catch { /* skip */ }
    } else if (existsSync(join(destDir, entry.name, "Cargo.toml"))) {
      names.push(entry.name); // rust crate keeps its bare name
    }
  }
  return names;
}

/** Copy one package into destDir/<folder>/. Returns the destination path. */
export function vendorPackage(root, pkg, destDir) {
  const from = join(root, pkg.dir);
  const to = join(destDir, vendorFolder(pkg));
  mkdirSync(to, { recursive: true });
  if (pkg.kind === "rust") {
    cpSync(from, to, { recursive: true, filter: (src) => !src.includes(`${"/"}target${"/"}`) });
  } else {
    cpSync(join(from, "src"), join(to, "src"), { recursive: true });
    cpSync(join(from, "package.json"), join(to, "package.json"));
  }
  return to;
}
