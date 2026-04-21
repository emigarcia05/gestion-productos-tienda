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
 * Flag "Proveedor Mercadería" (SI/NO).
 * Se persiste como boolean en `global_proveedores.proveedor_mercaderia`.
 * Acepta los valores del <select> del form (case-insensitive), "true"/"false" y boolean crudo.
 * Si no viene definido se asume `false` (coherente con el DEFAULT del schema final).
 */
export const proveedorMercaderiaSchema = z
  .union([z.string(), z.boolean(), z.undefined(), z.null()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (v == null) return false;
    const s = v.trim().toLowerCase();
    return s === "si" || s === "sí" || s === "true" || s === "1";
  });

export const createProveedorSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio.")
    .transform((s) => s.trim())
    .refine((s) => s.length >= 2, "El nombre debe tener al menos 2 caracteres."),
  prefijo: z
    .string()
    .min(1, "El prefijo es obligatorio.")
    .transform((s) => s.trim().toUpperCase())
    .refine((s) => /^[A-Z]{3}$/.test(s), "El prefijo debe tener exactamente 3 letras (A-Z)."),
  whatsapp: whatsappSchema,
  coeficienteTintometrico: coeficienteTintometricoSchema,
  plazosPagos: plazosPagosSchema,
  proveedorMercaderia: proveedorMercaderiaSchema,
});

export type CreateProveedorFormData = z.infer<typeof createProveedorSchema>;

/** Misma validación que crear (nombre + prefijo + whatsapp). Reutilizable en editar. */
export const updateProveedorSchema = createProveedorSchema;
export type UpdateProveedorFormData = z.infer<typeof updateProveedorSchema>;
