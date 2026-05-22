export const CX_PROD_SELECCION_PROM = "prom" as const;

/** Query `vincCosto` en Cx & Px Tienda. */
export const VINC_COSTO_SIN = "sin" as const;
export const VINC_COSTO_UNO = "uno" as const;
export const VINC_COSTO_MAS = "mas" as const;

export type ProveedorCxPxFiltro = {
  id: string;
  nombre: string;
  prefijo: string;
};

export interface OpcionCostoCxProdProveedor {
  tipo: "proveedor";
  codExt: string;
  etiqueta: string;
  costo: number;
}

export interface ItemCxPxTiendaParaTabla {
  id: string;
  codTienda: string;
  descripcion: string;
  codExtCostoLista: string | null;
  costoPromedio: number | null;
  opcionesProveedor: OpcionCostoCxProdProveedor[];
  /** `prom` = Cx. Prom.; si no, `cod_ext` del proveedor persistido o elegido. */
  seleccion: typeof CX_PROD_SELECCION_PROM | string;
  costoMostrado: number;
}
