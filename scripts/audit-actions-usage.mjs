#!/usr/bin/env node
/**
 * Lista Server Actions sin call sites en src/ (excluye src/actions).
 * Uso: node scripts/audit-actions-usage.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const actionDir = join(root, "src", "actions");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name) && !p.includes(`${join("src", "actions")}${join("", "")}`)) {
      if (!p.replace(/\\/g, "/").includes("/src/actions/")) acc.push(p);
    }
  }
  return acc;
}

const files = [];
function walkAll(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkAll(p);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
}
walkAll(join(root, "src"));

const corpus = files
  .filter((f) => !f.replace(/\\/g, "/").includes("/src/actions/"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const exports = [];
for (const af of readdirSync(actionDir).filter((f) => f.endsWith(".ts"))) {
  const t = readFileSync(join(actionDir, af), "utf8");
  for (const m of t.matchAll(/export async function (\w+)/g)) {
    exports.push({ name: m[1], file: af });
  }
}

const orphans = exports.filter((e) => {
  const re = new RegExp(`\\b${e.name}\\b`);
  return !re.test(corpus);
});

console.log(`Actions exportadas: ${exports.length}`);
if (orphans.length === 0) {
  console.log("Sin huérfanas detectadas.");
} else {
  console.log(`Huérfanas (${orphans.length}):`);
  for (const o of orphans) console.log(`  ${o.name} (${o.file})`);
}
