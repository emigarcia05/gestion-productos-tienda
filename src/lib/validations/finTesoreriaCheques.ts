import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

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

export type CrearFinTesoreriaChequeInput = z.infer<typeof crearFinTesoreriaChequeSchema>;
