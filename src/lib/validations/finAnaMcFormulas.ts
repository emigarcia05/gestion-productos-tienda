import { z } from "zod";
import { FIN_ANA_MC_FORMULA_CODIGOS } from "@/lib/finAnaMcFormulas";

export const actualizarFormulaMargenContribucionSchema = z.object({
  codigo: z.enum(FIN_ANA_MC_FORMULA_CODIGOS),
  valor: z.number().finite(),
});

export type ActualizarFormulaMargenContribucionInput = z.infer<
  typeof actualizarFormulaMargenContribucionSchema
>;
