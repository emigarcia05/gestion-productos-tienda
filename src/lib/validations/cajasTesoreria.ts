import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";
import { TITULARES_CAJA_TESORERIA } from "@/lib/cajasTesoreriaTitulares";

export const tipoCajaTesoreriaSchema = z.enum(["DIGITAL", "EFECTIVO", "CHEQUE"]);

export const montoCajaTesoreriaSchema = z
  .coerce
  .number()
  .int("El monto debe ser un número entero.")
  .min(-999_999_999, "El monto es demasiado bajo.")
  .max(999_999_999, "El monto es demasiado alto.");

export const crearCajaTesoreriaSchema = z.object({
  nombreCaja: z
    .string()
    .trim()
    .min(1, "El nombre de caja es obligatorio.")
    .max(120, "El nombre de caja es demasiado largo."),
  titular: z.enum(TITULARES_CAJA_TESORERIA, "Seleccioná un titular válido."),
  tipoCaja: tipoCajaTesoreriaSchema,
  monto: montoCajaTesoreriaSchema.optional().default(0),
});

export const editarCajaTesoreriaSchema = crearCajaTesoreriaSchema.extend({
  id: prismaCuidSchema,
});

export const eliminarCajaTesoreriaSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearCajaTesoreriaInput = z.infer<typeof crearCajaTesoreriaSchema>;
export type EditarCajaTesoreriaInput = z.infer<typeof editarCajaTesoreriaSchema>;
