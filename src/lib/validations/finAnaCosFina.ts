import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

function tieneMaxDosDecimales(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

const porcentajeFinAnaCosFinaSchema = z
  .number()
  .min(0)
  .max(100)
  .refine(tieneMaxDosDecimales, "El porcentaje admite hasta 2 decimales.");

export const actualizarFinAnaCosFinaCamposSchema = z
  .object({
    habilitado: z.boolean().optional(),
    impCheque: z.boolean().optional(),
    diasAcreditacion: z.number().int().min(0).max(999).nullable().optional(),
    arancel: porcentajeFinAnaCosFinaSchema.optional(),
    costoFinanciero: porcentajeFinAnaCosFinaSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Debe indicar al menos un campo a actualizar.");

export const actualizarFinAnaCosFinaSchema = z.object({
  id: prismaCuidSchema,
  campos: actualizarFinAnaCosFinaCamposSchema,
});

export type ActualizarFinAnaCosFinaInput = z.infer<typeof actualizarFinAnaCosFinaSchema>;
