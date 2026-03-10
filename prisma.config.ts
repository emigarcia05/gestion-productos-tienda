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
  if (!process.env.DATABASE_URL) loadEnv();
} catch {
  loadEnv();
}

export default {
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
};
