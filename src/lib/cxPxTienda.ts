export const CX_PROD_SELECCION_PROM = "prom" as const;

export interface OpcionCostoCxProdProveedor {
  tipo: "proveedor";
  codExt: string;
  etiqueta: string;
  costo: number;
}

/** Datos de columna CX PROD. (Cx Compra). */
export type CxProdDatosFila = {
  opcionesProveedor: OpcionCostoCxProdProveedor[];
  /** `prom` = Cx. Prom.; si no, `cod_ext` del proveedor persistido o elegido. */
  seleccion: typeof CX_PROD_SELECCION_PROM | string;
  costoPromedio: number | null;
  costoMostrado: number;
};

/** Costo CX PROD. mostrado según selección persistida en la fila. */
export function costoCxProdMostrado(item: CxProdDatosFila): number {
  if (item.seleccion === CX_PROD_SELECCION_PROM) {
    return item.costoPromedio ?? item.costoMostrado;
  }
  const op = item.opcionesProveedor.find((o) => o.codExt === item.seleccion);
  return op?.costo ?? item.costoMostrado;
}
