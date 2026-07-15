import type { MktPubliObjEje, MktPubliObjPeriodo } from "@prisma/client";

export type { MktPubliObjEje, MktPubliObjPeriodo };

export const MKT_PUBLI_OBJ_PERIODOS: MktPubliObjPeriodo[] = ["SEMANAL", "MENSUAL"];
export const MKT_PUBLI_OBJ_EJES: MktPubliObjEje[] = ["RED", "CONTENIDO", "SECCION"];

const ETIQUETAS_PERIODO: Record<MktPubliObjPeriodo, string> = {
  SEMANAL: "SEMANAL",
  MENSUAL: "MENSUAL",
};

const ETIQUETAS_EJE: Record<MktPubliObjEje, string> = {
  RED: "RED",
  CONTENIDO: "CONTENIDO",
  SECCION: "SECCION",
};

export function etiquetaMktPubliObjPeriodo(periodo: MktPubliObjPeriodo): string {
  return ETIQUETAS_PERIODO[periodo];
}

export function etiquetaMktPubliObjEje(eje: MktPubliObjEje): string {
  return ETIQUETAS_EJE[eje];
}

export function destinoClaveMktPubliObj(eje: MktPubliObjEje, destinoId: string): string {
  return `${eje}:${destinoId}`;
}

export type MktPublicacionObjItem = {
  id: string;
  periodo: MktPubliObjPeriodo;
  eje: MktPubliObjEje;
  cantidad: number;
  destinoId: string;
  destinoNombre: string;
};

/** Resultado de evaluar un objetivo contra un periodo concreto (para UI futura). */
export type MktPublicacionObjEvaluacion = MktPublicacionObjItem & {
  actual: number;
  cumplido: boolean;
};
