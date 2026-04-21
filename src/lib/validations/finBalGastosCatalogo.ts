import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

/**
 * Validaciones para el catálogo jerárquico Finanzas → Balance → Gastos:
 * fin_bal_gasto_tipo (1) ─→ fin_bal_gasto_rubro (N) ─→ fin_bal_cat_gasto (N) + fin_bal_gasto_provee (gasto ↔ proveedor).
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
});
export type CrearFinBalGastoInput = z.infer<typeof crearFinBalGastoSchema>;

export const editarFinBalGastoSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreCatalogoSchema,
  rubroId: prismaCuidSchema,
});
export type EditarFinBalGastoInput = z.infer<typeof editarFinBalGastoSchema>;

export const eliminarFinBalGastoSchema = z.object({
  id: prismaCuidSchema,
});
export type EliminarFinBalGastoInput = z.infer<typeof eliminarFinBalGastoSchema>;

// ─── Gasto ↔ proveedor (`fin_bal_gasto_provee`) ───────────────────────────

export const crearFinBalGastoProveeSchema = z.object({
  gastoId: prismaCuidSchema,
  proveedorId: prismaCuidSchema,
  gastoMensual: z.boolean(),
});
export type CrearFinBalGastoProveeInput = z.infer<typeof crearFinBalGastoProveeSchema>;

export const editarFinBalGastoProveeSchema = z.object({
  id: prismaCuidSchema,
  proveedorId: prismaCuidSchema,
  gastoMensual: z.boolean(),
});
export type EditarFinBalGastoProveeInput = z.infer<typeof editarFinBalGastoProveeSchema>;

export const eliminarFinBalGastoProveeSchema = z.object({
  id: prismaCuidSchema,
});
export type EliminarFinBalGastoProveeInput = z.infer<typeof eliminarFinBalGastoProveeSchema>;
