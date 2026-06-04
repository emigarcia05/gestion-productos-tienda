/** Tipos compartidos exportación / informes Px (PDF resumen aumentos). */

export interface RubroAumentoPromedioPx {
  rubro: string;
  aumentoPromedioPct: number;
}

export interface MarcaAumentosPromedioPx {
  marca: string;
  rubros: RubroAumentoPromedioPx[];
}

export interface ResumenAumentosPromedioPxExport {
  marcas: MarcaAumentosPromedioPx[];
}

export interface ProductoAumentoPxDetalle {
  descripcion: string;
  aumentoPct: number;
}

export interface RubroDetalleProductosPx {
  rubro: string;
  productos: ProductoAumentoPxDetalle[];
}

export interface MarcaDetalleProductosPx {
  marca: string;
  rubros: RubroDetalleProductosPx[];
}

export interface DetalleProductosAumentosPxExport {
  marcas: MarcaDetalleProductosPx[];
}

/** Datos completos para el PDF de resumen de aumentos. */
export interface InformeAumentosPxExport {
  resumen: ResumenAumentosPromedioPxExport;
  detalleProductos: DetalleProductosAumentosPxExport;
}
