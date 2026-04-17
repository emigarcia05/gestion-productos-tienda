import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

export const tipoCostoGastoSchema = z.enum(["VARIABLE", "FIJO"]);

const nombreGastoSchema = z
  .string()
  .trim()
  .min(1, "El nombre del gasto es obligatorio.")
  .max(200, "El nombre del gasto es demasiado largo.")
  .transform((v) => v.toUpperCase());

const nombreRubroSchema = z
  .string()
  .trim()
  .min(1, "El nombre del rubro es obligatorio.")
  .max(120, "El nombre del rubro es demasiado largo.")
  .transform((v) => v.toUpperCase());

/**
 * Discriminated por el modo de resolución del rubro:
 * - `EXISTENTE`: `rubroId` (cuid) obligatorio.
 * - `NUEVO`: `rubroNombreNuevo` obligatorio (se hace upsert por nombre en el service).
 */
export const crearGastoCatalogoSchema = z.discriminatedUnion("modoRubro", [
  z.object({
    modoRubro: z.literal("EXISTENTE"),
    rubroId: prismaCuidSchema,
    tipoCosto: tipoCostoGastoSchema,
    nombre: nombreGastoSchema,
  }),
  z.object({
    modoRubro: z.literal("NUEVO"),
    rubroNombreNuevo: nombreRubroSchema,
    tipoCosto: tipoCostoGastoSchema,
    nombre: nombreGastoSchema,
  }),
]);

export type CrearGastoCatalogoInput = z.infer<typeof crearGastoCatalogoSchema>;
