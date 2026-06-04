import type {
  CompetidorFalloRelevamientoFila,
  CompetidorPrecioFila,
} from "@/lib/competenciaPreciosFilaResumen";
import type { VinculoCompetenciaPxListas } from "@/lib/pxListasVinculos";

/** Opción de competidor con precio (armado en servidor para resumen/detalle). */
export type OpcionCompetenciaPxLista = {
  competenciaId: string;
  nombre: string;
  px: number | null;
};

export type ItemPxListasParaTabla = {
  id: string;
  codItem: string;
  descripcion: string;
  costoCompra: number;
  /** Precio lista principal DUX (`prod_tienda_listas_precios`, id lista principal). Referencia DIF TIENDA vs promedio. */
  pxListaTienda: number;
  pxPromedio: number | null;
  difPctTiendaVsPromedio: number | null;
  competidoresPrecioDetalle: CompetidorPrecioFila[];
  competidoresFalloDetalle: CompetidorFalloRelevamientoFila[];
  vinculosCompetencia: VinculoCompetenciaPxListas[];
};
