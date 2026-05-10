import { z } from "zod";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";

export const upsertFinBalIvaDebSchema = z
  .object({
    monto: z.coerce
      .number()
      .int("El monto debe ser un número entero.")
      .min(0, "El monto no puede ser negativo.")
      .max(2_000_000_000, "El monto es demasiado grande."),
  })
  .merge(mesAnioQuerySchema);

export type UpsertFinBalIvaDebInput = z.infer<typeof upsertFinBalIvaDebSchema>;
