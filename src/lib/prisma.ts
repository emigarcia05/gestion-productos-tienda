/**
 * Cliente Prisma – MODO RESET: no se usa en runtime.
 * Cuando reactive el backend, configurar aquí el cliente con reutilización
 * para serverless (globalThis) y adapter pg/Neon según acordado.
 */
// Placeholder: exportar un objeto que no se usa en modo mock.
// Para reactivar: descomentar y configurar createPrismaClient + globalForPrisma.
export const prisma = undefined as unknown as import("@prisma/client").PrismaClient;
