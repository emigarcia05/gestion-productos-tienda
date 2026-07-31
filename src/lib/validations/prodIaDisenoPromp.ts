import { z } from "zod";
import {
  ASISTENTE_IA_SUBMODULOS_PROMP,
  isAsistenteIaSubmoduloPromp,
} from "@/lib/asistenteIa";
import { prismaCuidSchema } from "@/lib/validations/common";

const submoduloCanonicoSchema = z
  .string()
  .trim()
  .min(1, "El submódulo es obligatorio.")
  .refine(isAsistenteIaSubmoduloPromp, {
    message: `El submódulo debe ser uno de: ${ASISTENTE_IA_SUBMODULOS_PROMP.join(", ")}.`,
  });

const prompSchema = z
  .string()
  .trim()
  .min(1, "El prompt es obligatorio.")
  .max(8000, "El prompt es demasiado largo.");

const urlRedireccionSchema = z
  .string()
  .trim()
  .min(1, "La URL es obligatoria.")
  .max(2000, "La URL es demasiado larga.")
  .url("La URL de redirección no es válida.");

const plantillaSuperficiesSchema = z
  .string()
  .trim()
  .max(500, "La plantilla de superficies es demasiado larga.")
  .optional()
  .nullable();

export const crearProdIaDisenoPrompSchema = z.object({
  submodulo: submoduloCanonicoSchema,
  promp: prompSchema,
  urlRedireccion: urlRedireccionSchema,
  plantillaSuperficies: plantillaSuperficiesSchema,
});

/** En edición el submódulo no se renombra (queda fijo al módulo del hub). */
export const editarProdIaDisenoPrompSchema = z.object({
  id: prismaCuidSchema,
  promp: prompSchema,
  urlRedireccion: urlRedireccionSchema,
  plantillaSuperficies: plantillaSuperficiesSchema,
});

export const eliminarProdIaDisenoPrompSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearProdIaDisenoPrompInput = z.infer<typeof crearProdIaDisenoPrompSchema>;
export type EditarProdIaDisenoPrompInput = z.infer<typeof editarProdIaDisenoPrompSchema>;
