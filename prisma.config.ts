import "dotenv/config";
import { defineConfig } from "prisma/config";

// Usar SIEMPRE variables de entorno. Nunca dejar credenciales en el repo.
// En Vercel: Settings → Environment Variables → DATABASE_URL y opcionalmente DIRECT_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "",
  },
});