import { z } from "zod";

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
});

export type CreateProveedorFormData = z.infer<typeof createProveedorSchema>;
