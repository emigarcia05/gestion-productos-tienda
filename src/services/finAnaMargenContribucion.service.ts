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
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";

export type { CxFinancieroPorFormaPago };

export type DatosPaginaMargenContribucion = {
  filasCostosFinancieros: FinAnaCosFinaItem[];
  terminales: FinAnaCosFinaTerminalItem[];
  cxFinancieroPorFormaPago: CxFinancieroPorFormaPago;
};

export async function getDatosPaginaMargenContribucion(): Promise<DatosPaginaMargenContribucion> {
  await ensureFinAnaCosFinaSeed();
  const [filasCostosFinancieros, terminales] = await Promise.all([
    listarFinAnaCosFina(),
    listarFinAnaCosFinaTerminales(),
  ]);

  return {
    filasCostosFinancieros,
    terminales,
    cxFinancieroPorFormaPago: mapCxFinancieroPorFormaPago(filasCostosFinancieros),
  };
}
