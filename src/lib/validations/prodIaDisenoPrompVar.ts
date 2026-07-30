import { z } from "zod";
import { isFuentePromptValida } from "@/lib/asistenteIa";
import { prismaCuidSchema } from "@/lib/validations/common";

const variableNombreSchema = z
  .string()
  .trim()
  .min(1, "El nombre de variable es obligatorio.")
  .max(60, "El nombre de variable es demasiado largo.")
  .regex(
    /^[A-Za-z][A-Za-z0-9_]*$/,
    "Usá solo letras, números y guión bajo; debe empezar con letra.",
  );

export const listarProdIaDisenoPrompVarsSchema = z.object({
  prompId: prismaCuidSchema,
});

export const guardarProdIaDisenoPrompVarsSchema = z.object({
  prompId: prismaCuidSchema,
  items: z
    .array(
      z.object({
        fuente: z
          .string()
          .trim()
          .min(1)
          .refine(isFuentePromptValida, "Fuente de variable inválida."),
        variable: variableNombreSchema,
      }),
    )
    .min(1, "Indicá al menos una variable.")
    .superRefine((items, ctx) => {
      const vars = items.map((i) => i.variable.trim().toUpperCase());
      const fuentes = items.map((i) => i.fuente);
      if (new Set(vars).size !== vars.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hay nombres de variable duplicados.",
        });
      }
      if (new Set(fuentes).size !== fuentes.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hay fuentes duplicadas.",
        });
      }
    }),
});

export type ListarProdIaDisenoPrompVarsInput = z.infer<
  typeof listarProdIaDisenoPrompVarsSchema
>;
export type GuardarProdIaDisenoPrompVarsInput = z.infer<
  typeof guardarProdIaDisenoPrompVarsSchema
>;
