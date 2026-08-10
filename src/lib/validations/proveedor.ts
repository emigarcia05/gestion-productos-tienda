import { z } from "zod";

const whatsappSchema = z
  .string()
  .optional()
  .default("")
  .transform((s) => (s ?? "").trim().replace(/\D/g, ""))
  .refine((v) => v.length === 0 || (v.length >= 10 && v.length <= 15), "WhatsApp: 10 a 15 dígitos (internacional sin +).")
  .transform((v) => (v === "" ? null : v));

const coeficienteTintometricoSchema = z
  .string()
  .optional()
  .default("1")
  .transform((s) => (s ?? "").trim())
  .transform((s) => (s === "" ? "1" : s))
  .transform((s) => s.replace(/\s+/g, "").replace(",", "."))
  .refine((s) => /^(\d+)(\.\d{1,6})?$/.test(s), "Coef. Tintométrico inválido (hasta 6 decimales).")
  .transform((s) => Number(s))
  .refine((n) => Number.isFinite(n) && n > 0, "Coef. Tintométrico debe ser mayor a 0.")
  .refine((n) => n <= 1_000_000, "Coef. Tintométrico fuera de rango.");

const PLAZOS_PAGO_PERMITIDOS = new Set([30, 60, 90, 120, 150]);

/** Cadena canónica `30,60,90` o null si vacío. Días de vencimiento desde la fecha del comprobante. */
export const plazosPagosSchema = z
  .string()
  .optional()
  .default("")
  .transform((s) => (s ?? "").trim())
  .transform((s) => (s === "" ? null : s))
  .superRefine((s, ctx) => {
    if (s === null) return;
    const parts = s.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Plazos inválidos." });
      return;
    }
    const nums = parts.map((p) => Number.parseInt(p, 10));
    if (nums.some((n) => !Number.isFinite(n) || !PLAZOS_PAGO_PERMITIDOS.has(n))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Solo se permiten 30, 60, 90, 120 o 150 (separados por coma).",
      });
      return;
    }
    for (let i = 1; i < nums.length; i++) {
      if ((nums[i] as number) <= (nums[i - 1] as number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Los plazos deben ir en orden creciente (ej. 30, 60).",
        });
        return;
      }
    }
  })
  .transform((s) => {
    if (s === null || s === undefined) return null as string | null;
    const trimmed = (s as string).trim();
    if (trimmed === "") return null;
    const parts = trimmed.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
    const nums = parts.map((p) => Number.parseInt(p, 10));
    return nums.join(",");
  });

/**
 * Flag "Proveedor Mercadería" desde el form (hidden `si` / `no`).
 * Obligatorio en alta y edición: no se infiere un default si falta el valor.
 */
export const proveedorMercaderiaFormSchema = z
  .string()
  .transform((s) => (s ?? "").trim().toLowerCase())
  .refine((s) => s === "si" || s === "no", "Seleccioná SI o NO en Proveedor Mercadería.")
  .transform((s) => s === "si");

/**
 * Flag "Es Fábrica" desde el form (hidden `si` / `no`).
 * Obligatorio en alta y edición.
 */
export const esFabricaFormSchema = z
  .string()
  .transform((s) => (s ?? "").trim().toLowerCase())
  .refine((s) => s === "si" || s === "no", "Seleccioná SI o NO en Es Fábrica.")
  .transform((s) => s === "si");

/**
 * Política de IVA del proveedor desde el form. Reutiliza el módulo
 * compartido `@/lib/validations/iva` (la fuente de verdad para los 3
 * valores del enum Postgres `IvaProveedor`); acá se mantienen los aliases
 * históricos para compatibilidad con call sites (`ProveedorForm`,
 * `crearProveedor`, `editarProveedor`, etc.).
 */
import {
  IVA_VALUES as IVA_VALUES_SHARED,
  ivaPoliticaFormSchema,
  type IvaValue as IvaValueShared,
} from "@/lib/validations/iva";

export const IVA_PROVEEDOR_VALUES = IVA_VALUES_SHARED;
export type IvaProveedorValue = IvaValueShared;
export const ivaProveedorFormSchema = ivaPoliticaFormSchema;

/** Prefijo opcional: vacío → null; si hay texto, exactamente 3 letras A-Z. */
export const prefijoProveedorOpcionalSchema = z
  .string()
  .optional()
  .default("")
  .transform((s) => (s ?? "").trim().toUpperCase())
  .transform((s) => (s === "" ? null : s))
  .refine((s) => s === null || /^[A-Z]{3}$/.test(s), "Si completás prefijo, deben ser exactamente 3 letras (A-Z).");

/**
 * Tiempo de entrega en días desde el form.
 * Vacío → `null`; si hay valor, entero ≥ 0 y ≤ 999.
 */
export const tiempoEntregaEnDiasSchema = z
  .string()
  .optional()
  .default("")
  .transform((s) => (s ?? "").trim())
  .transform((s) => (s === "" ? null : s))
  .superRefine((s, ctx) => {
    if (s === null) return;
    if (!/^\d+$/.test(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tiempo de entrega: solo números enteros (días).",
      });
      return;
    }
    const n = Number.parseInt(s, 10);
    if (!Number.isFinite(n) || n < 0 || n > 999) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tiempo de entrega: entre 0 y 999 días.",
      });
    }
  })
  .transform((s) => (s === null ? null : Number.parseInt(s, 10)));

export const createProveedorSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio.")
    .transform((s) => s.trim())
    .refine((s) => s.length >= 2, "El nombre debe tener al menos 2 caracteres."),
  prefijo: prefijoProveedorOpcionalSchema,
  whatsapp: whatsappSchema,
  coeficienteTintometrico: coeficienteTintometricoSchema,
  plazosPagos: plazosPagosSchema,
  tiempoEntregaEnDias: tiempoEntregaEnDiasSchema,
  proveedorMercaderia: proveedorMercaderiaFormSchema,
  esFabrica: esFabricaFormSchema,
  iva: ivaProveedorFormSchema,
});

export type CreateProveedorFormData = z.infer<typeof createProveedorSchema>;

/** Misma validación que crear. Reutilizable en editar. */
export const updateProveedorSchema = createProveedorSchema;
export type UpdateProveedorFormData = z.infer<typeof updateProveedorSchema>;
