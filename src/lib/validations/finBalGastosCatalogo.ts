import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

/**
 * Validaciones para el catálogo jerárquico Finanzas → Balance → Gastos:
 * fin_bal_gasto_tipo (1) ─→ fin_bal_gasto_rubro (N) ─→ fin_bal_gasto (N).
 *
 * Convención de normalización: todos los `nombre` se normalizan con `trim + toUpperCase`,
 * consistente con fin_tesoreria_cajas, movimientos_finanzas.nombre y demás catálogos finanzas.
 */

const nombreCatalogoSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(120, "El nombre es demasiado largo.")
  .transform((value) => value.toUpperCase());

/**
 * FK opcional a `proveedores.id`.
 * Acepta: CUID válido, `null`, `undefined` o string vacío (normalizado a `null`).
 * Se exporta como `string | null` para que el servicio pueda pasarlo directo a Prisma.
 */
const proveedorIdOpcionalSchema = z
  .union([prismaCuidSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value == null || value === "" ? null : value));

/**
 * Flags booleanos tolerantes: aceptan `"si" | "no" | "true" | "false" | "1" | "0"`
 * (strings de `FormData`), booleanos nativos, `null` o `undefined`. Cualquier valor
 * ausente/indeterminado se colapsa a `false` (default del catálogo).
 */
const booleanFlagSchema = z
  .union([z.string(), z.boolean(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (value == null) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === "si" || normalized === "sí" || normalized === "true" || normalized === "1";
  });

// ─── Tipo (raíz) ──────────────────────────────────────────────────────────

export const crearFinBalGastoTipoSchema = z.object({
  nombre: nombreCatalogoSchema,
});
export type CrearFinBalGastoTipoInput = z.infer<typeof crearFinBalGastoTipoSchema>;

export const editarFinBalGastoTipoSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreCatalogoSchema,
});
export type EditarFinBalGastoTipoInput = z.infer<typeof editarFinBalGastoTipoSchema>;

export const eliminarFinBalGastoTipoSchema = z.object({
  id: prismaCuidSchema,
});
export type EliminarFinBalGastoTipoInput = z.infer<typeof eliminarFinBalGastoTipoSchema>;

// ─── Rubro (intermedio) ───────────────────────────────────────────────────

export const crearFinBalGastoRubroSchema = z.object({
  nombre: nombreCatalogoSchema,
  tipoId: prismaCuidSchema,
});
export type CrearFinBalGastoRubroInput = z.infer<typeof crearFinBalGastoRubroSchema>;

export const editarFinBalGastoRubroSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreCatalogoSchema,
  tipoId: prismaCuidSchema,
});
export type EditarFinBalGastoRubroInput = z.infer<typeof editarFinBalGastoRubroSchema>;

export const eliminarFinBalGastoRubroSchema = z.object({
  id: prismaCuidSchema,
});
export type EliminarFinBalGastoRubroInput = z.infer<typeof eliminarFinBalGastoRubroSchema>;

// ─── Gasto (hoja) ─────────────────────────────────────────────────────────

export const crearFinBalGastoSchema = z.object({
  nombre: nombreCatalogoSchema,
  rubroId: prismaCuidSchema,
  proveedorId: proveedorIdOpcionalSchema,
  gastoMensual: booleanFlagSchema,
});
export type CrearFinBalGastoInput = z.infer<typeof crearFinBalGastoSchema>;

export const editarFinBalGastoSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreCatalogoSchema,
  rubroId: prismaCuidSchema,
  proveedorId: proveedorIdOpcionalSchema,
  gastoMensual: booleanFlagSchema,
});
export type EditarFinBalGastoInput = z.infer<typeof editarFinBalGastoSchema>;

export const eliminarFinBalGastoSchema = z.object({
  id: prismaCuidSchema,
});
export type EliminarFinBalGastoInput = z.infer<typeof eliminarFinBalGastoSchema>;
