import { z } from "zod";
import {
  FIN_ANA_MC_DESCUENTO_MAX,
  FIN_ANA_MC_DESCUENTO_MIN,
} from "@/lib/finAnaMargenContribucion";
import { prismaCuidOrUuidSchema } from "@/lib/validations/common";

export const actualizarDescuentoFpMargenContribucionSchema = z.object({
  pagoId: prismaCuidOrUuidSchema,
  descuentoPct: z
    .number()
    .int()
    .min(FIN_ANA_MC_DESCUENTO_MIN)
    .max(FIN_ANA_MC_DESCUENTO_MAX),
});

export type ActualizarDescuentoFpMargenContribucionInput = z.infer<
  typeof actualizarDescuentoFpMargenContribucionSchema
>;
