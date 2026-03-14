import { z } from "zod";

const whatsappSchema = z
  .string()
  .optional()
  .default("")
  .transform((s) => (s ?? "").trim().replace(/\D/g, ""))
  .refine((v) => v.length === 0 || (v.length >= 10 && v.length <= 15), "WhatsApp: 10 a 15 dígitos (internacional sin +).")
  .transform((v) => (v === "" ? null : v));

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
});

export type CreateProveedorFormData = z.infer<typeof createProveedorSchema>;

/** Misma validación que crear (nombre + prefijo + whatsapp). Reutilizable en editar. */
export const updateProveedorSchema = createProveedorSchema;
export type UpdateProveedorFormData = z.infer<typeof updateProveedorSchema>;
