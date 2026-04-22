import { z } from "zod";
import { globalSucursalIdSchema } from "@/lib/validations/common";

export const tipoMovimientoFinanzasSchema = z.enum([
  "EFECTIVO",
  "BANCO",
  "CHEQUE",
]);

export const montoMovimientoFinanzasSchema = z
  .coerce.number()
  .finite("El monto debe ser un número válido.")
  .refine((n) => Number.isFinite(n) && Math.abs(n) < 1_000_000_000_000, "El monto es demasiado alto.");

export const crearMovimientoFinanzasSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(200, "El nombre es demasiado largo.")
    .transform((value) => value.toUpperCase()),
  tipoGasto: tipoMovimientoFinanzasSchema,
  sucursalId: globalSucursalIdSchema,
  monto: montoMovimientoFinanzasSchema,
});

export type CrearMovimientoFinanzasInput = z.infer<typeof crearMovimientoFinanzasSchema>;
