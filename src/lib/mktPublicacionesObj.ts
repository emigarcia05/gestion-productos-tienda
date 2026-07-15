import type { MktPubliObjEje, MktPubliObjPeriodo } from "@prisma/client";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import type { MktCuadroMandoSemanaFiltro } from "@/lib/mktPublicacionesEstadisticas";

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

/** Prefijo UI para mensajes de incumplimiento (Title Case + tipificación). */
const PREFIJO_EJE_UI: Record<MktPubliObjEje, string> = {
  RED: "Red",
  CONTENIDO: "Contenido",
  SECCION: "Sección",
};

export function etiquetaMktPubliObjPeriodo(periodo: MktPubliObjPeriodo): string {
  return ETIQUETAS_PERIODO[periodo];
}

export function etiquetaMktPubliObjEje(eje: MktPubliObjEje): string {
  return ETIQUETAS_EJE[eje];
}

export function prefijoEjeObjetivoUi(eje: MktPubliObjEje): string {
  return PREFIJO_EJE_UI[eje];
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

/** Resultado de evaluar un objetivo contra un periodo concreto. */
export type MktPublicacionObjEvaluacion = MktPublicacionObjItem & {
  actual: number;
  cumplido: boolean;
};

/** Semana Todas → MENSUAL; semana 1–5 → SEMANAL. */
export function periodoObjParaSemanaFiltro(
  semana: MktCuadroMandoSemanaFiltro
): MktPubliObjPeriodo {
  return semana === "TODAS" ? "MENSUAL" : "SEMANAL";
}

/**
 * Evalúa objetivos contra publicaciones ya filtradas a la ventana del cuadro de mando.
 * Cuenta cualquier publicación programada (fila `mkt_publi`).
 */
export function evaluarMktPublicacionObjsCliente(
  objetivos: MktPublicacionObjItem[],
  publicaciones: MktPublicacionCalendarioItem[],
  periodoObj: MktPubliObjPeriodo
): MktPublicacionObjEvaluacion[] {
  return objetivos
    .filter((o) => o.periodo === periodoObj)
    .map((o) => {
      let actual = 0;
      if (o.eje === "RED") {
        actual = publicaciones.filter((p) => p.redId === o.destinoId).length;
      } else if (o.eje === "CONTENIDO") {
        actual = publicaciones.filter((p) => p.tipoContenidoId === o.destinoId).length;
      } else {
        actual = publicaciones.filter((p) => p.ideaSeccionId === o.destinoId).length;
      }
      return {
        ...o,
        actual,
        cumplido: actual >= o.cantidad,
      };
    });
}

/** Ej.: `Red INSTAGRAM → Faltan 2 contenidos` / `Sección X → Falta 1 contenido`. */
export function textoIncumplimientoObjetivo(e: MktPublicacionObjEvaluacion): string {
  const faltan = Math.max(0, e.cantidad - e.actual);
  const frase = faltan === 1 ? "Falta 1 contenido" : `Faltan ${faltan} contenidos`;
  return `${prefijoEjeObjetivoUi(e.eje)} ${e.destinoNombre} → ${frase}`;
}
