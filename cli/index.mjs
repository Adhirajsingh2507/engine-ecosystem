#!/usr/bin/env node
// engine-ecosystem CLI — vendor selected engine packages into a project.
// Dependency-free (Node built-ins only) so `npx github:...` runs with nothing to
// install. Cross-platform (Windows/macOS/Linux).
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { scanRegistry, aliasMap } from "./registry.mjs";
import { resolveNames, missingDeps } from "./resolve.mjs";
import { presentPackages, vendorPackage, vendorFolder } from "./vendor.mjs";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // cli/ → repo root
const registry = scanRegistry(REPO_ROOT);
const aliases = aliasMap(registry);
const byName = new Map(registry.map((p) => [p.name, p]));

const argv = process.argv.slice(2);
const cmd = argv[0];

function printList() {
  console.log("\nengine-ecosystem — vendorable packages\n");
  let cat = "";
  for (const p of registry) {
    if (p.category !== cat) { cat = p.category; console.log(`  ${cat}`); }
    const short = vendorFolder(p);
    const deps = p.deps.length ? `  ← ${p.deps.map((d) => d.replace(/^@engine\//, "")).join(", ")}` : "";
    console.log(`    ${short.padEnd(16)} [${p.stability}] ${p.description}${deps}`);
  }
  console.log("\nAdd with:  npx engine-ecosystem add <name...> [--dest <dir>]");
  console.log("Deps are NOT auto-added — include them explicitly (see below).\n");
}

function printUsage() {
  console.log(`engine-ecosystem <command>

  list                         show all packages, their stability and deps
  add <name...> [--dest DIR]   vendor packages (default dest: ./engine)
  add                          interactive picker

Names accept the short form ("physics") or full ("@engine/physics").
Dependency policy: a package is only added if each of its @engine/* deps is
already present in the destination or named in the same command; otherwise the
command fails and tells you what to add.`);
}

function parseAdd(args) {
  const names = [];
  let dest = "engine";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dest") { dest = args[++i] ?? dest; }
    else names.push(args[i]);
  }
  return { names, dest: resolve(process.cwd(), dest) };
}

function doAdd(names, destDir) {
  const { resolved, unknown } = resolveNames(names, aliases);
  if (unknown.length) {
    console.error(`Unknown package(s): ${unknown.join(", ")}`);
    console.error(`Run "engine-ecosystem list" to see valid names.`);
    process.exit(1);
  }

  const present = presentPackages(destDir);
  const problems = missingDeps(resolved, present, byName);
  if (problems.length) {
    console.error("Cannot add — missing dependencies (they are not auto-added):\n");
    const needed = new Set();
    for (const { name, missing } of problems) {
      console.error(`  ${name} needs: ${missing.join(", ")}`);
      for (const m of missing) needed.add(m.replace(/^@engine\//, ""));
    }
    const full = [...new Set([...resolved.map((n) => vendorFolder(byName.get(n))), ...needed])];
    console.error(`\nAdd them explicitly, e.g.:\n  npx engine-ecosystem add ${full.join(" ")}\n`);
    process.exit(1);
  }

  for (const name of resolved) {
    const to = vendorPackage(REPO_ROOT, byName.get(name), destDir);
    console.log(`  + ${name} → ${to.replace(process.cwd() + "/", "")}`);
  }
  const rel = destDir.replace(process.cwd() + "/", "") || destDir;
  console.log(`\nVendored ${resolved.length} package(s) into ${rel}/`);
  console.log(`Make @engine/* resolve to them — pick one:`);
  console.log(`  • pnpm/npm/yarn workspace: add "${rel}/*" to your workspace globs, then install`);
  console.log(`  • tsconfig: "paths": { "@engine/*": ["${rel}/*/src"] }\n`);
}

function interactiveAdd() {
  printList();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Packages to add (space-separated names, or "all"): ', (answer) => {
    rl.close();
    const trimmed = answer.trim();
    if (!trimmed) { console.log("Nothing selected."); return; }
    const names = trimmed === "all" ? registry.map((p) => vendorFolder(p)) : trimmed.split(/\s+/);
    doAdd(names, resolve(process.cwd(), "engine"));
  });
}

switch (cmd) {
  case undefined:
  case "list":
    printList();
    break;
  case "add": {
    const rest = argv.slice(1);
    if (rest.length === 0) interactiveAdd();
    else { const { names, dest } = parseAdd(rest); doAdd(names, dest); }
    break;
  }
  case "help":
  case "-h":
  case "--help":
    printUsage();
    break;
  default:
    console.error(`Unknown command: ${cmd}\n`);
    printUsage();
    process.exit(1);
}
