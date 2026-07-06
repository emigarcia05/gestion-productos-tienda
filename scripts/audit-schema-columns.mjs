#!/usr/bin/env node
/**
 * Auditoría: campos Prisma vs referencias camelCase/snake en src/.
 * Uso: node scripts/audit-schema-columns.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "prisma", "schema.prisma");
const srcDir = join(root, "src");

const schema = readFileSync(schemaPath, "utf8");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const corpus = walk(srcDir).map((f) => readFileSync(f, "utf8")).join("\n");

const modelBlocks = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];

const skipFields = new Set([
  "id",
  "createdAt",
  "updatedAt",
  // relaciones inversas se detectan mal; revisar manual
]);

const results = [];

for (const [, modelName, body] of modelBlocks) {
  const lines = body.split("\n");
  for (const line of lines) {
    const fieldMatch = line.match(/^\s+(\w+)\s+/);
    if (!fieldMatch) continue;
    const field = fieldMatch[1];
    if (field.startsWith("@@") || field === modelName) continue;

    const mapMatch = line.match(/@map\("([^"]+)"\)/);
    const sqlCol = mapMatch?.[1] ?? null;

    const isRelation =
      line.includes("@relation") ||
      /^\s+\w+\s+\w+(\[\])?\s*$/.test(line) && !line.includes("@default") && !line.includes("@db") && !line.includes("String") && !line.includes("Int") && !line.includes("Boolean") && !line.includes("Decimal") && !line.includes("DateTime") && !line.includes("Json") && !line.includes("enum");

    if (isRelation && line.includes("@relation")) continue;
    if (skipFields.has(field)) continue;

    const patterns = [field];
    if (sqlCol) patterns.push(sqlCol);

    let hits = 0;
    for (const p of patterns) {
      const reCamel = new RegExp(`\\b${p}\\b`, "g");
      hits += (corpus.match(reCamel) ?? []).length;
    }

    if (hits === 0) {
      results.push({ model: modelName, field, sqlCol, hits });
    }
  }
}

console.log("=== Campos sin referencia en src/ (heurística) ===\n");
for (const r of results.sort((a, b) => a.model.localeCompare(b.model) || a.field.localeCompare(b.field))) {
  console.log(`${r.model}.${r.field}${r.sqlCol ? ` (@map ${r.sqlCol})` : ""}`);
}
console.log(`\nTotal sospechosos: ${results.length}`);
