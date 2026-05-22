export const CX_PROD_SELECCION_PROM = "prom" as const;

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
