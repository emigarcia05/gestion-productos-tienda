/**
 * Post-deploy: materializa desc_especial desde reglas específicas por producto.
 * Uso: npm run db:recalc-desc-especial
 */
import "dotenv/config";

import { recalcularTodasLasFilasDescEspecial } from "@/services/descEspecialReglas.service";

async function main(): Promise<void> {
  const actualizados = await recalcularTodasLasFilasDescEspecial();
  console.log(`Materialización desc_especial completada: ${actualizados} filas actualizadas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
