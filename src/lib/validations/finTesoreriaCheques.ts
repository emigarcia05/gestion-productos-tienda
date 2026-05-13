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

export const tipoChequeTesoreriaSchema = z.enum(["FISICO", "ECHEQUE"]);

/** FK opcional a `global_proveedores` con `proveedor_mercaderia = true`. */
export const entregaProveedorMercaderiaIdChequeSchema = z.union([prismaCuidSchema, z.null()]).optional();

export const crearFinTesoreriaChequeSchema = z.object({
  cajaId: prismaCuidSchema,
  tipo: tipoChequeTesoreriaSchema,
  tenedor: tenedorChequeTesoreriaSchema,
  emisor: z
    .string()
    .trim()
    .min(1, "Indique el emisor.")
    .max(500, "Emisor demasiado largo."),
  monto: montoChequeTesoreriaSchema,
  fechaAcreditacion: isoYmdSchema,
  entregaProveedorId: entregaProveedorMercaderiaIdChequeSchema,
});

export const finTesoreriaChequesVistaSchema = z.enum(["actuales", "entregados"]);

export type FinTesoreriaChequesVista = z.infer<typeof finTesoreriaChequesVistaSchema>;

export const listarFinTesoreriaChequesPorCajaSchema = z.object({
  cajaId: prismaCuidSchema,
  vista: finTesoreriaChequesVistaSchema.default("actuales"),
});

export const actualizarFinTesoreriaChequeSchema = z.object({
  id: prismaCuidSchema,
  tipo: tipoChequeTesoreriaSchema,
  tenedor: tenedorChequeTesoreriaSchema,
  emisor: z
    .string()
    .trim()
    .min(1, "Indique el emisor.")
    .max(500, "Emisor demasiado largo."),
  monto: montoChequeTesoreriaSchema,
  fechaAcreditacion: isoYmdSchema,
  entregaProveedorId: entregaProveedorMercaderiaIdChequeSchema,
});

export const eliminarFinTesoreriaChequeSchema = z.object({
  id: prismaCuidSchema,
});

export const transferirFinTesoreriaChequeSchema = z.object({
  chequeId: prismaCuidSchema,
  cajaDestinoId: prismaCuidSchema,
  /** Registro opcional; `null` = sin proveedor de entrega. */
  entregaProveedorId: z.union([prismaCuidSchema, z.null()]),
});

/** Solo actualiza `entrega_proveedor` en cheque no transferido (proveedor de mercadería obligatorio). */
export const marcarEntregaProveedorChequeSchema = z.object({
  chequeId: prismaCuidSchema,
  entregaProveedorId: prismaCuidSchema,
});

export type CrearFinTesoreriaChequeInput = z.infer<typeof crearFinTesoreriaChequeSchema>;
export type ActualizarFinTesoreriaChequeInput = z.infer<
  typeof actualizarFinTesoreriaChequeSchema
>;
export type TransferirFinTesoreriaChequeInput = z.infer<typeof transferirFinTesoreriaChequeSchema>;
export type MarcarEntregaProveedorChequeInput = z.infer<typeof marcarEntregaProveedorChequeSchema>;
