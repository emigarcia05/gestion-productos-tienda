/**
 * Limpia filas inconsistentes de `prod_ped_merc` para Reposición por BULTO.
 *
 * Criterio de borrado:
 * - tipo_de_pedido = 'REPOSICION'
 * - reposicion_forma_pedido = 'POR_BULTO'
 *
 * Uso:
 *   npm run db:purge-reposicion-por-bulto
 *   npm run db:purge-reposicion-por-bulto -- --execute
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";

type Args = {
  execute: boolean;
};

function parseArgs(argv: string[]): Args {
  let execute = false;

  for (const arg of argv) {
    if (arg === "--execute") execute = true;
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Uso: tsx scripts/purge-prod-ped-merc-reposicion-por-bulto.ts [--execute]"
      );
      process.exit(0);
    }
  }

  return { execute };
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));

  console.log("── Limpieza prod_ped_merc (REPOSICION + POR_BULTO) ──");
  console.log(
    execute
      ? "Modo: EJECUCIÓN"
      : "Modo: simulación (agregá --execute para aplicar)"
  );

  const where = {
    tipoDePedido: "REPOSICION",
    reposicionFormaPedido: "POR_BULTO",
  } as const;

  const candidatos = await prisma.prodPedMerc2.count({ where });
  console.log(`Registros candidatos: ${candidatos}`);

  if (!execute) {
    if (candidatos > 0) {
      console.log(
        "Para borrar definitivamente: npm run db:purge-reposicion-por-bulto -- --execute"
      );
    }
    return;
  }

  const result = await prisma.prodPedMerc2.deleteMany({ where });
  console.log(`Registros eliminados: ${result.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
