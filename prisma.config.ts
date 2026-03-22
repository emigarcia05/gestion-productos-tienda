// Cargar .env desde la raíz del proyecto (donde está este archivo)
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(projectRoot, ".env");

function loadEnv(): void {
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

try {
  const dotenv = createRequire(import.meta.url)("dotenv");
  dotenv.config({ path: envPath });
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) loadEnv();
} catch {
  loadEnv();
}

/** Migraciones (`migrate deploy` / `migrate dev`): Neon recomienda conexión directa (sin pooler). La app sigue usando `DATABASE_URL` en `src/lib/prisma.ts`. */
const datasourceUrl =
  (process.env.DIRECT_URL ?? "").trim() ||
  (process.env.DATABASE_URL ?? "").trim();

export default {
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: datasourceUrl,
  },
};
