import { z } from "zod";
import { FIN_ANA_MC_VARIABLES_OBJETIVO } from "@/lib/finAnaMcConfig";

export const guardarFinAnaMcConfigSchema = z.object({
  terminalId: z.string().min(1).nullable(),
  tipoComprobante: z.enum(["FACTURA_A", "FACTURA_C"]),
  variableObjetivo: z.enum(FIN_ANA_MC_VARIABLES_OBJETIVO),
});

export type GuardarFinAnaMcConfigInput = z.infer<
  typeof guardarFinAnaMcConfigSchema
>;
