import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

/** Fila de `/proveedores` (tabla legacy unificada con `prod_precios_provee`). */
export interface ProductoProveedoresPage {
  id: string;
  codProdProv: string;
  codigoExterno: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
  descuentoRubro: number;
  descuentoCantidad: number;
  cxTransporte: number;
  pxCompraFinalSinIva: number | null;
  disponible: boolean;
  proveedor: { id: string; nombre: string; codigoUnico: string; prefijo: string };
}

export function mapFilaListaPrecioToProductoProveedoresPage(
  f: FilaListaPrecioParaCliente
): ProductoProveedoresPage | null {
  if (!f.proveedor) return null;
  return {
    id: f.codExt,
    codProdProv: f.codProdProveedor,
    codigoExterno: f.codExt,
    descripcion: f.descripcion,
    precioLista: f.pxListaProveedor,
    precioVentaSugerido: f.pxVtaSugerido ?? 0,
    descuentoRubro: f.dtoRubro,
    descuentoCantidad: f.dtoCantidad,
    cxTransporte: f.cxTransporte,
    pxCompraFinalSinIva: f.pxCompraFinalSinIva,
    disponible: f.habilitado,
    proveedor: {
      id: f.proveedor.id,
      nombre: f.proveedor.nombre,
      codigoUnico: f.proveedor.codigoUnico,
      prefijo: f.proveedor.prefijo,
    },
  };
}
