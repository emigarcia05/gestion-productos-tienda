import { getDescripcionesListaPrecioPorCodExtAction } from "@/actions/listaPrecios";

export interface ProductoVinculadoReglaDescEspecial {
  codExt: string;
  descripcion: string;
}

/** Resuelve descripción efectiva por `cod_ext` vía consulta directa en lista de precios. */
export async function resolverDescripcionesProductosDescEspecial(
  codigosExt: string[]
): Promise<ProductoVinculadoReglaDescEspecial[]> {
  if (codigosExt.length === 0) return [];

  const res = await getDescripcionesListaPrecioPorCodExtAction(codigosExt);
  if (!res.ok || !res.data) {
    return codigosExt.map((codExt) => ({ codExt, descripcion: codExt }));
  }

  const descripcionPorCod = new Map(
    res.data.productos.map((p) => [p.codExt, p.descripcion] as const)
  );

  return codigosExt.map((codExt) => ({
    codExt,
    descripcion: descripcionPorCod.get(codExt) ?? codExt,
  }));
}
