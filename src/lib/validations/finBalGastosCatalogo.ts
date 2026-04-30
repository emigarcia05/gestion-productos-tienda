import { z } from "zod";
import {
  globalSucursalIdSchema,
  prismaCuidOrUuidSchema,
  prismaCuidSchema,
} from "@/lib/validations/common";

/**
 * Validaciones para el catálogo jerárquico Finanzas → Balance → Gastos:
 * fin_bal_gasto_tipo (1) ─→ fin_bal_gasto_rubro (N) ─→ fin_bal_cat_gasto (N) + fin_bal_gasto_final (gasto + proveedor + sucursal; la terna puede repetirse entre filas).
 *
 * Convención de normalización: todos los `nombre` se normalizan con `trim + toUpperCase`,
 * consistente con fin_tesoreria, movimientos_finanzas.nombre y demás catálogos finanzas.
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

// ─── Gasto final (`fin_bal_gasto_final`: gasto + proveedor + sucursal) ─────

const diaDevengadoSchema = z.coerce
  .number()
  .int("El día devengado debe ser un número entero.")
  .min(1, "El día devengado debe ser entre 1 y 28.")
  .max(28, "El día devengado debe ser entre 1 y 28.");

const vencimientoSchema = z.coerce
  .number()
  .int("El plazo de pago debe ser un número entero de días.")
  .min(1, "El plazo de pago debe ser entre 1 y 30 días.")
  .max(30, "El plazo de pago debe ser entre 1 y 30 días.");

const comentariosFinBalGastoFinalSchema = z
  .string()
  .max(10000, "Los comentarios no pueden superar 10000 caracteres.")
  .optional()
  .nullable()
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim().toLocaleUpperCase("es-AR");
    return t === "" ? null : t;
  });

export const crearFinBalGastoFinalSchema = z.object({
  gastoId: prismaCuidOrUuidSchema,
  proveedorId: prismaCuidOrUuidSchema,
  sucursalId: globalSucursalIdSchema,
  gastoMensual: z.boolean(),
  diaDevengado: diaDevengadoSchema,
  vencimiento: vencimientoSchema,
  comentarios: comentariosFinBalGastoFinalSchema,
});
export type CrearFinBalGastoFinalInput = z.infer<typeof crearFinBalGastoFinalSchema>;

export const editarFinBalGastoFinalSchema = z.object({
  id: prismaCuidSchema,
  proveedorId: prismaCuidOrUuidSchema,
  sucursalId: globalSucursalIdSchema,
  gastoMensual: z.boolean(),
  diaDevengado: diaDevengadoSchema,
  vencimiento: vencimientoSchema,
  comentarios: comentariosFinBalGastoFinalSchema,
});
export type EditarFinBalGastoFinalInput = z.infer<typeof editarFinBalGastoFinalSchema>;

export const eliminarFinBalGastoFinalSchema = z.object({
  id: prismaCuidSchema,
});
export type EliminarFinBalGastoFinalInput = z.infer<typeof eliminarFinBalGastoFinalSchema>;
