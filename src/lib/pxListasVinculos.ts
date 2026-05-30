import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

export type VinculoCompetenciaPxListas = {
  competenciaId: string;
} & DatoVinculoCompetenciaCliente;

export function vinculosArrayToRecord(
  list: VinculoCompetenciaPxListas[]
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
): VinculoCompetenciaPxListas[] {
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
