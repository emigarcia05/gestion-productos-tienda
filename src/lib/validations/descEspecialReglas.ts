import { z } from "zod";

import {
  listaPreciosCodExtListSchema,
  listaPreciosCodExtSchema,
} from "@/lib/validations/common";
import { porcentajeListaPreciosSchema } from "@/lib/validations/listaPrecios";
import { prismaIdSchema } from "@/lib/validations/common";

export const crearReglaDescEspecialSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  valor: porcentajeListaPreciosSchema,
  codigosExt: listaPreciosCodExtListSchema.min(
    1,
    "Seleccioná al menos un producto."
  ),
});

export type CrearReglaDescEspecialInput = z.infer<typeof crearReglaDescEspecialSchema>;

export const actualizarReglaDescEspecialSchema = z.object({
  id: prismaIdSchema,
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  valor: porcentajeListaPreciosSchema,
  codigosExt: listaPreciosCodExtListSchema.min(
    1,
    "Seleccioná al menos un producto."
  ),
});

export type ActualizarReglaDescEspecialInput = z.infer<typeof actualizarReglaDescEspecialSchema>;

export const eliminarReglaDescEspecialSchema = z.object({
  id: prismaIdSchema,
});

export type EliminarReglaDescEspecialInput = z.infer<typeof eliminarReglaDescEspecialSchema>;

export const obtenerReglaDescEspecialDetalleSchema = z.object({
  id: prismaIdSchema,
});

export const reglaDescEspecialPorCodExtSchema = z.object({
  codExt: listaPreciosCodExtSchema,
});
