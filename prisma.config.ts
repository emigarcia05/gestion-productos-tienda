import "dotenv/config";
import { defineConfig } from "prisma/config";

// Modo frontend only: la app no conecta a BD en runtime (datos mock). DATABASE_URL solo
// se usa para migraciones/studio cuando se reactive la BD.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "",
  },
});