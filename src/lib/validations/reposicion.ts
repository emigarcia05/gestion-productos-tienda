import { z } from "zod";

export const sucursalReposicionSchema = z.enum(["guaymallen", "maipu"]);

export const getReposicionParamsSchema = z.object({
  q: z.string().max(500).optional().default(""),
  marca: z.string().max(200).optional().default(""),
  rubro: z.string().max(200).optional().default(""),
  subRubro: z.string().max(200).optional().default(""),
  configurado: z.enum(["", "si"]).optional().default(""),
  pagina: z.preprocess(
    (v) => (v === undefined || v === null || v === "" ? 1 : v),
    z.coerce.number().int().min(1).max(10_000)
  ),
});

export const productosReposicionSelectorSchema = z.object({
  q: z.string().max(500).optional().default(""),
});
