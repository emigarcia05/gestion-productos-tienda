/**
 * Verifica que la tabla pedidos_reposicion en Neon coincida con el modelo Prisma.
 * Ejecutar: npm run db:verify-reposicion
 *
 * - Si la tabla no existe o las columnas no coinciden, Prisma lanzará error.
 * - Si todo está bien, imprime las columnas esperadas y un conteo de filas.
 */
import dotenv from "dotenv";
import { join } from "path";

dotenv.config({ path: join(__dirname, "..", ".env") });
dotenv.config({ path: join(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL no está definida. Crea un archivo .env en la raíz del proyecto con DATABASE_URL=...");
  process.exit(1);
}

const ESQUEMA_ESPERADO = {
  tabla: "pedidos_reposicion",
  columnas: [
    "id",
    "id_proveedor",
    "sucursal",
    "cod_ext",
    "punto_reposicion",
    "forma_pedir",
    "cant",
    "cant_pedir",
    "created_at",
    "updated_at",
  ],
  enum: "FormaPedirReposicion (CANT_MAXIMA | CANT_FIJA)",
};

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  console.log("Verificando tabla pedidos_reposicion vs esquema Prisma...\n");
  console.log("Esquema esperado (backend):");
  console.log("  Tabla:", ESQUEMA_ESPERADO.tabla);
  console.log("  Columnas:", ESQUEMA_ESPERADO.columnas.join(", "));
  console.log("  Tipo forma_pedir:", ESQUEMA_ESPERADO.enum);
  console.log("");

  try {
    const count = await prisma.itemPedidoReposicion.count();
    const sample = await prisma.itemPedidoReposicion.findMany({ take: 1 });

    console.log("✓ Conexión OK. Prisma puede leer la tabla.");
    console.log("  Filas en pedidos_reposicion:", count);
    if (sample.length > 0) {
      console.log("  Ejemplo de fila (campos):", Object.keys(sample[0]).join(", "));
    } else {
      console.log("  (tabla vacía; estructura validada al hacer count + findMany)");
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("✗ Error al leer pedidos_reposicion:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
