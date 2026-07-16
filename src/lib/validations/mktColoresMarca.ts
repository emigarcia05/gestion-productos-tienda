import { z } from "zod";
import { parseCodHexadecimalesInput } from "@/lib/mktColoresMarca";
import { prismaCuidSchema } from "@/lib/validations/common";

const nombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre.")
  .max(200, "El nombre es demasiado largo.");

const descripcionSchema = z
  .string()
  .trim()
  .max(10000, "La descripción es demasiado larga.");

const codHexadecimalesSchema = z
  .string()
  .trim()
  .min(1, "Ingresá al menos un código hexadecimal.")
  .max(2000, "Demasiados códigos.")
  .transform((raw, ctx) => {
    const codes = parseCodHexadecimalesInput(raw);
    if (codes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresá códigos hex válidos (ej. #FF0000 o FF0000).",
      });
      return z.NEVER;
    }
    return codes;
  });

export const crearMktColorMarcaSchema = z.object({
  nombre: nombreSchema,
  descripcion: descripcionSchema,
  codHexadecimales: codHexadecimalesSchema,
});

export const editarMktColorMarcaSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreSchema,
  descripcion: descripcionSchema,
  codHexadecimales: codHexadecimalesSchema,
});

export const eliminarMktColorMarcaSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearMktColorMarcaInput = z.infer<typeof crearMktColorMarcaSchema>;
export type EditarMktColorMarcaInput = z.infer<typeof editarMktColorMarcaSchema>;
export type EliminarMktColorMarcaInput = z.infer<typeof eliminarMktColorMarcaSchema>;
