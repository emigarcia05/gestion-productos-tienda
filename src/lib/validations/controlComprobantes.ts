import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

export const PLAZOS_PAGO_COMPROBANTE_PERMITIDOS = [30, 60, 90, 120, 150] as const;

const plazoPagoComprobanteSchema = z
  .union([
    z.literal("default"),
    z.coerce.number().int().refine(
      (n) =>
        PLAZOS_PAGO_COMPROBANTE_PERMITIDOS.includes(
          n as (typeof PLAZOS_PAGO_COMPROBANTE_PERMITIDOS)[number]
        ),
      { message: "Plazo inválido (30, 60, 90, 120 o 150)." }
    ),
  ])
  .transform((v) => (v === "default" ? null : v));

export const actualizarPlazoPagoComprobanteSchema = z.object({
  id: prismaCuidSchema,
  plazoPagoDias: plazoPagoComprobanteSchema,
});

export const toggleControladoSchema = z.object({
  id: prismaCuidSchema,
  controlado: z.boolean(),
});
