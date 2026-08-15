import { z } from "zod";

/** Valores persistidos en `prod_ped_merc.reposicion_forma_pedido`. */
export const REPOSICION_FORMA_PEDIDO_VALUES = [
  "CANT_MAX",
  "CANT_FIJA_POR_BULTO",
  "CANT_FIJA_POR_UNIDAD",
] as const;

/** Vendedor → Reposición: no incluye CANT_FIJA_POR_UNIDAD. */
export const REPOSICION_FORMA_PEDIDO_VENDEDOR_VALUES = [
  "CANT_MAX",
  "CANT_FIJA_POR_BULTO",
] as const;

/** Pedido A Fáb.: no incluye CANT_MAX. */
export const REPOSICION_FORMA_PEDIDO_FABRICA_VALUES = [
  "CANT_FIJA_POR_BULTO",
  "CANT_FIJA_POR_UNIDAD",
] as const;

export const reposicionFormaPedidoSchema = z.enum(REPOSICION_FORMA_PEDIDO_VALUES);
export const reposicionFormaPedidoVendedorSchema = z.enum(
  REPOSICION_FORMA_PEDIDO_VENDEDOR_VALUES
);
export const reposicionFormaPedidoFabricaSchema = z.enum(
  REPOSICION_FORMA_PEDIDO_FABRICA_VALUES
);

export type ReposicionFormaPedido = z.infer<typeof reposicionFormaPedidoSchema>;
export type ReposicionFormaPedidoVendedor = z.infer<
  typeof reposicionFormaPedidoVendedorSchema
>;
export type ReposicionFormaPedidoFabrica = z.infer<
  typeof reposicionFormaPedidoFabricaSchema
>;

export const REPOSICION_FORMA_PEDIDO_LABELS: Record<ReposicionFormaPedido, string> = {
  CANT_MAX: "CANT. MAX.",
  CANT_FIJA_POR_BULTO: "CANT. FIJA POR BULTO",
  CANT_FIJA_POR_UNIDAD: "CANT. FIJA POR UNID.",
};

/** Labels cortos del desplegable FORMA PEDIR en Pedido A Fáb. (vendedor sigue usando los de arriba). */
export const REPOSICION_FORMA_PEDIDO_FABRICA_LABELS: Record<
  ReposicionFormaPedidoFabrica,
  string
> = {
  CANT_FIJA_POR_BULTO: "BULTO",
  CANT_FIJA_POR_UNIDAD: "UNIDAD",
};

/** Lee valor persistido (incluye alias previos a la migración). */
export function normalizarReposicionFormaPedido(
  raw: string | null | undefined
): ReposicionFormaPedido | null {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "CANT_MAX" || v === "CANT_MAXIMA" || v === "CANT. MAX.") {
    return "CANT_MAX";
  }
  if (v === "CANT_FIJA_POR_BULTO" || v === "CANT_FIJA" || v === "CANT. FIJA") {
    return "CANT_FIJA_POR_BULTO";
  }
  if (v === "CANT_FIJA_POR_UNIDAD") return "CANT_FIJA_POR_UNIDAD";
  return null;
}

export function labelReposicionFormaPedido(
  raw: string | null | undefined
): string {
  const n = normalizarReposicionFormaPedido(raw);
  return n ? REPOSICION_FORMA_PEDIDO_LABELS[n] : "";
}

export function esFormaCantFijaReposicion(
  forma: ReposicionFormaPedido
): boolean {
  return (
    forma === "CANT_FIJA_POR_BULTO" || forma === "CANT_FIJA_POR_UNIDAD"
  );
}

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
