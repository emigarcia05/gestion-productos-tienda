/**
 * Verifica que la tabla prod_ped_merc en Neon coincida con el modelo Prisma.
 * Ejecutar: npm run db:verify-mercaderia (o el script equivalente)
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
  tabla: "prod_ped_merc",
  columnas: [
    "id",
    "tipo_de_pedido",
    "sucursal_id",
    "urgente_cod_ext",
    "urgente_cant_pedir",
    "tintometrico_descripcion",
    "tintometrio_cant_pedir",
    "tintometrico_proveedor",
    "reposicion_forma_pedido",
    "reposicion_punto_pedido",
    "reposicion_cant_conf",
    "reposicion_cant_pedir",
    "reposicion_cod_tienda",
  ],
};

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  console.log("Verificando tabla prod_ped_merc vs esquema Prisma...\n");
  console.log("Esquema esperado (backend):");
  console.log("  Tabla:", ESQUEMA_ESPERADO.tabla);
  console.log("  Columnas:", ESQUEMA_ESPERADO.columnas.join(", "));
  console.log("");

  try {
    const count = await prisma.prodPedMerc2.count();
    const sample = await prisma.prodPedMerc2.findMany({ take: 1 });

    console.log("✓ Conexión OK. Prisma puede leer la tabla.");
    console.log("  Filas en prod_ped_merc:", count);
    if (sample.length > 0) {
      console.log("  Ejemplo de fila (campos):", Object.keys(sample[0]).join(", "));
    } else {
      console.log("  (tabla vacía; estructura validada al hacer count + findMany)");
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("✗ Error al leer prod_ped_merc:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
