/**
 * Tipos para Producto + Proveedor (contrato UI / servicios).
 * En modo reset no dependen de Prisma; al reactivar la BD se pueden volver a inferir del schema.
 */
export interface ProveedorResumen {
  id: string;
  nombre: string;
  prefijo: string;
}

export interface ProductoCompleto {
  id: string;
  codProdProv: string;
  codigoExterno: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
  descuentoRubro: number;
  descuentoCantidad: number;
  cxTransporte: number;
  /** Precio de compra final desde precios_proveedores.px_compra_final. Si viene null, se usa cálculo en cliente. */
  pxCompraFinal?: number | null;
  disponible: boolean;
  proveedorId: string;
  proveedor: ProveedorResumen;
  createdAt: Date;
  updatedAt: Date;
}
