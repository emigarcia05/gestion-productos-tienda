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
  /** Margen % manual (`prod_tienda_margen_edicion`); `null` = sin edición. */
  margenManual: number | null;
  /** Margen % derivado del precio DUX. */
  margenDux: number | null;
  /** PX mostrado: calculado desde margen manual si existe; si no, precio DUX. */
  pxEfectivo: number | null;
  /** Margen % mostrado: manual si existe; si no, margen DUX. */
  margenPct: number | null;
  /** `true` si hay margen manual distinto al margen DUX (pendiente actualizar en DUX). */
  requiereActualizar: boolean;
};

export type ItemPxListasPreciosTabla = {
  codTienda: string;
  descripcion: string;
  costoCompra: number;
  preciosPorLista: PrecioListaPxListasCelda[];
};
