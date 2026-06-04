/** Catálogo de lista DUX para columnas dinámicas en Px Listas. */
export type ListaPrecioPxListasColumna = {
  idLista: number;
  nombreLista: string;
};

/** Precio por lista en una fila del listado Px Listas. */
export type PrecioListaPxListasCelda = {
  idLista: number;
  /** Espejo DUX (`prod_tienda_precios`). */
  pxDux: number | null;
  /** Override manual (`prod_tienda_precios_edicion`); `null` = sin edición. */
  pxEdicion: number | null;
  /** Valor mostrado/editado: edición si existe, si no DUX. */
  pxEfectivo: number | null;
  margenPct: number | null;
};

export type ItemPxListasPreciosTabla = {
  codTienda: string;
  descripcion: string;
  costoCompra: number;
  preciosPorLista: PrecioListaPxListasCelda[];
};
