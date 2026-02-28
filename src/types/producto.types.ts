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
  descuentoProducto: number;
  descuentoCantidad: number;
  cxTransporte: number;
  disponible: boolean;
  proveedorId: string;
  proveedor: ProveedorResumen;
  createdAt: Date;
  updatedAt: Date;
}
