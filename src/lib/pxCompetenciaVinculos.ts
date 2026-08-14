import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

export type VinculoPxCompetencia = {
  competenciaId: string;
} & DatoVinculoCompetenciaCliente;

export function vinculosArrayToRecord(
  list: VinculoPxCompetencia[]
): Record<string, DatoVinculoCompetenciaCliente> {
  const out: Record<string, DatoVinculoCompetenciaCliente> = {};
  for (const { competenciaId, ...vinculo } of list) {
    out[competenciaId] = vinculo;
  }
  return out;
}

export function vinculosRecordToArray(
  record: Record<string, DatoVinculoCompetenciaCliente>,
  competenciaIds: string[]
): VinculoPxCompetencia[] {
  return competenciaIds.map((competenciaId) => ({
    competenciaId,
    ...(record[competenciaId] ?? {
      urlProducto: null,
      tipoPagina: null,
      pxCompetencia: null,
      estado: "SIN_URL",
      errorMensaje: null,
      relevadoAt: null,
      urlBloqueadaPorPxSugerido: false,
    }),
  }));
}

/** true si el producto tiene al menos un vínculo con URL o Px. Vta. Sugerido. */
export function productoTieneVinculosRelevables(
  vinculos: VinculoPxCompetencia[]
): boolean {
  return vinculos.some(
    (v) => v.urlBloqueadaPorPxSugerido || !!v.urlProducto?.trim()
  );
}
