/**
 * Cliente Prisma – DESHABILITADO (modo frontend only).
 * No se usa conexión a base de datos. Toda la lógica de datos usa mock en services.
 * Restaurar cuando se defina la nueva arquitectura de BD.
 */
// import { PrismaClient } from "@prisma/client";
// import { PrismaPg } from "@prisma/adapter-pg";

// const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// function createPrisma(): PrismaClient {
//   const connectionString = process.env.DATABASE_URL;
//   if (!connectionString) {
//     throw new Error("DATABASE_URL no está definida. Configurala en Vercel o en .env.");
//   }
//   const adapter = new PrismaPg({ connectionString });
//   return new PrismaClient({ adapter });
// }

// export const prisma = globalForPrisma.prisma ?? createPrisma();

// if (process.env.NODE_ENV !== "production") {
//   globalForPrisma.prisma = prisma;
// }

// No se exporta cliente: modo frontend only. Los services usan datos mock.
