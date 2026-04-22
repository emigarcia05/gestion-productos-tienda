import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";
import { TITULARES_CAJA_TESORERIA } from "@/lib/cajasTesoreriaTitulares";

export const tenedorChequeTesoreriaSchema = z.enum(
  TITULARES_CAJA_TESORERIA,
  "Seleccioná un tenedor válido."
);

const isoYmdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (use YYYY-MM-DD).")
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, "Fecha de calendario inválida.");

export const montoChequeTesoreriaSchema = z
  .number()
  .int("El monto debe ser entero.")
  .min(0, "El monto no puede ser negativo.")
  .max(2_000_000_000, "Monto demasiado grande.");

export const crearFinTesoreriaChequeSchema = z.object({
  cajaId: prismaCuidSchema,
  tenedor: tenedorChequeTesoreriaSchema,
  emisor: z
    .string()
    .trim()
    .min(1, "Indique el emisor.")
    .max(500, "Emisor demasiado largo."),
  monto: montoChequeTesoreriaSchema,
  fechaAcreditacion: isoYmdSchema,
});

export const listarFinTesoreriaChequesPorCajaSchema = z.object({
  cajaId: prismaCuidSchema,
});

export const actualizarFinTesoreriaChequeSchema = z.object({
  id: prismaCuidSchema,
  tenedor: tenedorChequeTesoreriaSchema,
  emisor: z
    .string()
    .trim()
    .min(1, "Indique el emisor.")
    .max(500, "Emisor demasiado largo."),
  monto: montoChequeTesoreriaSchema,
  fechaAcreditacion: isoYmdSchema,
});

export const eliminarFinTesoreriaChequeSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearFinTesoreriaChequeInput = z.infer<typeof crearFinTesoreriaChequeSchema>;
export type ActualizarFinTesoreriaChequeInput = z.infer<
  typeof actualizarFinTesoreriaChequeSchema
>;
