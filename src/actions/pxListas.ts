"use server";

import { getTiendaPageData } from "@/actions/tienda";

export type ItemPxListasParaTabla = {
  id: string;
  codItem: string;
  descripcion: string;
  /** Espejo DUX (`px_lista_tienda`). */
  precioLista: number;
};

/** Listado paginado para **Px Listas** (mismos filtros que Cx Compra, sin enriquecer CX PROD.). */
export async function getPxListasPageData(params: {
  q?: string;
  rubro?: string;
  subRubro?: string;
  marca?: string;
  proveedor?: string;
  vinculado?: string;
  pagina?: string;
}) {
  const data = await getTiendaPageData(params);
  const items: ItemPxListasParaTabla[] = data.items.map((row) => ({
    id: row.id,
    codItem: row.codItem,
    descripcion: row.descripcion,
    precioLista: row.precioLista,
  }));
  return { ...data, items };
}
