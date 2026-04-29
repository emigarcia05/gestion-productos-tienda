import { z } from "zod";

/** Valores persistidos en `prod_ped_merc_2.reposicion_forma_pedido` (única fuente canónica). */
export const reposicionFormaPedidoSchema = z.enum(["CANT_MAXIMA", "CANT_FIJA"]);

export type ReposicionFormaPedido = z.infer<typeof reposicionFormaPedidoSchema>;

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
