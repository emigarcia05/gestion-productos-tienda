import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const submoduloSchema = z
  .string()
  .trim()
  .min(1, "El submódulo es obligatorio.")
  .max(120, "El submódulo es demasiado largo.");

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

export const crearProdIaDisenoPrompSchema = z.object({
  submodulo: submoduloSchema,
  promp: prompSchema,
  urlRedireccion: urlRedireccionSchema,
});

export const editarProdIaDisenoPrompSchema = z.object({
  id: prismaCuidSchema,
  submodulo: submoduloSchema,
  promp: prompSchema,
  urlRedireccion: urlRedireccionSchema,
});

export const eliminarProdIaDisenoPrompSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearProdIaDisenoPrompInput = z.infer<typeof crearProdIaDisenoPrompSchema>;
export type EditarProdIaDisenoPrompInput = z.infer<typeof editarProdIaDisenoPrompSchema>;
