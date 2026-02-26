/**
 * Tipos para Producto + Proveedor (y opcionalmente vínculos con TiendaColor).
 * Garantizan que la UI nunca reciba undefined en relaciones cargadas.
 */

export interface ProveedorResumen {
  id: string;
  nombre: string;
  sufijo: string;
}

/** Producto de Lista Proveedores con proveedor siempre presente (para listados y detalle) */
export interface ProductoCompleto {
  id: string;
  codProdProv: string;
  codExt: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
  descuentoProducto: number;
  descuentoCantidad: number;
  cxTransporte: number;
  disponible: boolean;
  proveedorId: string;
  proveedor: ProveedorResumen;
  createdAt: Date;
  updatedAt: Date;
}
