import type { EstCategorizacionItem } from "@/lib/estCategorizacionTypes";

/** Modo de agregación para gráficos de Estadísticas Vtas. */
export type EstVtasModoUnidad = "unidad" | "suma";

/** Dimensión del eje Y del gráfico Un. Vendidas. */
export type EstVtasEjeY =
  | "variante"
  | "marca"
  | "rubro"
  | "subRubro"
  | "color"
  | "terminacion";

export const EST_VTAS_EJE_Y_OPTIONS: readonly {
  value: EstVtasEjeY;
  label: string;
}[] = [
  { value: "variante", label: "VARIANTE" },
  { value: "marca", label: "MARCA" },
  { value: "rubro", label: "RUBRO" },
  { value: "subRubro", label: "SUB RUBRO" },
  { value: "color", label: "COLOR" },
  { value: "terminacion", label: "TERMINACION" },
] as const;

export function etiquetaEstVtasEjeY(eje: EstVtasEjeY): string {
  return EST_VTAS_EJE_Y_OPTIONS.find((o) => o.value === eje)?.label ?? "VARIANTE";
}

/** Desglose opcional del gráfico 1 (agrupa cada categoría por sucursal). */
export type EstVtasDesglose = "ninguno" | "sucursal";

export const EST_VTAS_DESGLOSE_OPTIONS: readonly {
  value: EstVtasDesglose;
  label: string;
}[] = [
  { value: "ninguno", label: "SIN DESGLOSE" },
  { value: "sucursal", label: "SUCURSAL" },
] as const;

export function etiquetaEstVtasDesglose(d: EstVtasDesglose): string {
  return (
    EST_VTAS_DESGLOSE_OPTIONS.find((o) => o.value === d)?.label ?? "SIN DESGLOSE"
  );
}

/** Producto tipado para Estadísticas Vtas (categorización + factor de suma). */
export type EstVtasProductoItem = EstCategorizacionItem & {
  /**
   * Multiplicador para modo **SUMA DE UNIDADES**:
   * conversión a unidad con suma, o presentación numérica si la unidad medida suma; si no, 1.
   */
  factorSuma: number;
};

/** Venta en unidades importada (`est_por_prod`) para el dashboard de Vtas. */
export type EstVtasVentaItem = {
  sucursalId: string;
  mes: number;
  anio: number;
  codTienda: string;
  vtasEnUn: number;
};

/** Punto del gráfico dimensión (eje Y) × Un. vendidas (eje X). */
export type EstVtasBarraDimension = {
  etiqueta: string;
  unidades: number;
};

/** Barra de una sucursal dentro de un grupo (desglose del gráfico 1). */
export type EstVtasBarraSucursal = {
  sucursalId: string;
  etiqueta: string;
  unidades: number;
};

/**
 * Grupo del gráfico 1 con desglose SUCURSAL:
 * categoría del eje Y + barras hijas por sucursal.
 */
export type EstVtasGrupoDimension = {
  etiqueta: string;
  unidades: number;
  sucursales: EstVtasBarraSucursal[];
};

/** Selección en desglose jerárquico (categoría + sucursal). */
export type EstVtasSeleccionDesglose = {
  categoria: string;
  sucursalEtiqueta: string;
  sucursalId: string;
};

/** Filtro dimensional (categoría elegida en un gráfico de barras). */
export type EstVtasFiltroDimension = {
  ejeY: EstVtasEjeY;
  etiqueta: string;
};

/** Punto del gráfico temporal: mes (1–12) × Un. vendidas. */
export type EstVtasPuntoMensual = {
  mes: number;
  unidades: number;
};

/** Fila del Top 10 productos (gráfico 2 · tabla). */
export type EstVtasBarraProducto = {
  codTienda: string;
  /** Descripción del producto (columna DESCRIPCION). */
  etiqueta: string;
  /** Un. vendidas en el periodo FECHA (TOTAL PERIODO). */
  totalPeriodo: number;
  /**
   * Promedio mensual: total acumulado (sin FECHA) / cantidad de periodos
   * mes×año con ventas &gt; 0.
   */
  promedioMensual: number;
};

/** @deprecated Usar `EstVtasBarraDimension`. */
export type EstVtasBarraVariante = EstVtasBarraDimension;
