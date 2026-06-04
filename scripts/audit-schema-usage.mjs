#!/usr/bin/env node
/**
 * Auditoría rápida: modelos Prisma vs referencias prisma.<camelCase> en src/.
 * Uso: node scripts/audit-schema-usage.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "prisma", "schema.prisma");
const srcDir = join(root, "src");

const schema = readFileSync(schemaPath, "utf8");
const models = [...schema.matchAll(/^model (\w+)/gm)].map((m) => m[1]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const files = walk(srcDir);
const corpus = files.map((f) => readFileSync(f, "utf8")).join("\n");

const prismaClient = models.map((m) => {
  const camel = m[0].toLowerCase() + m.slice(1);
  const re = new RegExp(`prisma\\.${camel}\\b`, "g");
  const hits = (corpus.match(re) ?? []).length;
  return { model: m, prismaAccessor: camel, prismaHits: hits };
});

const rawTables = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((m) => m[1]);
const rawUsage = rawTables.map((table) => {
  const re = new RegExp(`["'\`]${table}["'\`]`, "g");
  const hits = (corpus.match(re) ?? []).length;
  return { table, rawHits: hits };
});

console.log("=== Modelos Prisma (schema.prisma) ===\n");
for (const row of prismaClient) {
  const flag = row.prismaHits === 0 ? " ⚠ sin prisma.*" : "";
  console.log(`${row.model.padEnd(28)} prisma.${row.prismaAccessor}${flag} (${row.prismaHits})`);
}

console.log("\n=== Tablas SQL (@@map) sin modelo Prisma ===\n");
const inSchema = new Set(rawTables);
const extraRaw = ["prod_rendimientos", "prod_ped_ult_comp"];
for (const t of [...extraRaw, ...inSchema]) {
  if (inSchema.has(t) && t !== "prod_rendimientos") continue;
  const re = new RegExp(`["'\`]${t}["'\`]`, "g");
  const hits = (corpus.match(re) ?? []).length;
  if (t === "prod_rendimientos" || hits > 0) {
    console.log(`${t.padEnd(32)} raw/SQL refs: ${hits}${inSchema.has(t) ? "" : " (sin @@map en schema)"}`);
  }
}

console.log("\n=== Resumen ===");
const unused = prismaClient.filter((r) => r.prismaHits === 0);
console.log(`Modelos: ${models.length}; sin prisma.*: ${unused.length}`);
if (unused.length) {
  console.log("Revisar uso vía $queryRaw:", unused.map((u) => u.model).join(", "));
}
