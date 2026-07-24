import {
  mapCxFinancieroPorFormaPago,
  type CxFinancieroPorFormaPago,
} from "@/lib/finAnaMargenContribucion";
import {
  ensureFinAnaCosFinaSeed,
  listarFinAnaCosFina,
  type FinAnaCosFinaItem,
} from "@/services/finAnaCosFina.service";
import { listarFinAnaCosFinaTerminales } from "@/services/finAnaCosFinaTerminal.service";
import { listarFinAnaCosFinaPagos } from "@/services/finAnaCosFinaPago.service";
import type { FinAnaCosFinaPagoItem } from "@/lib/finAnaCosFinaPagos";
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";
import { listarDescuentosFpMargenContribucion } from "@/services/finAnaMcDescuentoFp.service";
import type { DescuentoFpMargenContribucionMap } from "@/services/finAnaMcDescuentoFp.service";
import { listarFormulasMargenContribucion } from "@/services/finAnaMcFormulas.service";
import type { FinAnaMcFormulaItem } from "@/lib/finAnaMcFormulas";
import { listarFinAnaMcCategorias } from "@/services/finAnaMcCategorias.service";
import type { FinAnaMcCategoriaItem } from "@/lib/finAnaMcCategorias";

export type { CxFinancieroPorFormaPago };

export type DatosPaginaMargenContribucion = {
  filasCostosFinancieros: FinAnaCosFinaItem[];
  terminales: FinAnaCosFinaTerminalItem[];
  pagos: FinAnaCosFinaPagoItem[];
  cxFinancieroPorFormaPago: CxFinancieroPorFormaPago;
  descuentosPorFormaPago: DescuentoFpMargenContribucionMap;
  formulas: FinAnaMcFormulaItem[];
  categoriasMc: FinAnaMcCategoriaItem[];
};

export async function getDatosPaginaMargenContribucion(): Promise<DatosPaginaMargenContribucion> {
  await ensureFinAnaCosFinaSeed();
  const [
    filasCostosFinancieros,
    terminales,
    pagos,
    descuentosPorFormaPago,
    formulas,
    categoriasMc,
  ] = await Promise.all([
    listarFinAnaCosFina(),
    listarFinAnaCosFinaTerminales(),
    listarFinAnaCosFinaPagos(),
    listarDescuentosFpMargenContribucion(),
    listarFormulasMargenContribucion(),
    listarFinAnaMcCategorias(),
  ]);

  return {
    filasCostosFinancieros,
    terminales,
    pagos,
    cxFinancieroPorFormaPago: mapCxFinancieroPorFormaPago(filasCostosFinancieros, pagos),
    descuentosPorFormaPago,
    formulas,
    categoriasMc,
  };
}
