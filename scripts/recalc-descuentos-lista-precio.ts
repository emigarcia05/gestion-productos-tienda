/**
 * Post-deploy: materializa dto_* / cx_transporte desde reglas (vacías → todo 0).
 * Uso: npm run db:recalc-descuentos-lista-precio
 */
import "dotenv/config";

import { recalcularTodasLasFilas } from "@/services/descuentosListaPrecioReglas.service";

async function main(): Promise<void> {
  const { actualizados } = await recalcularTodasLasFilas();
  console.log(`Materialización completada: ${actualizados} filas actualizadas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
