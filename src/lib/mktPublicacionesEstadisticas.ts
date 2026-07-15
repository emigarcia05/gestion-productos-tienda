import { addDaysToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import {
  construirSemanasDelMes,
  type MktCalendarioMesAnio,
} from "@/lib/mktCalendarioPublicaciones";

export type MktStatFila = {
  id: string;
  nombre: string;
  cantidad: number;
};

export type MktCuadroMandoStats = {
  redes: MktStatFila[];
  contenido: MktStatFila[];
};

/** Semana dentro del mes en vista: todas o fila 1–5 del calendario. */
export type MktCuadroMandoSemanaFiltro = "TODAS" | 1 | 2 | 3 | 4 | 5;

export const MKT_CUADRO_MANDO_SEMANAS: ReadonlyArray<{
  id: MktCuadroMandoSemanaFiltro;
  label: string;
}> = [
  { id: "TODAS", label: "Todas" },
  { id: 1, label: "1" },
  { id: 2, label: "2" },
  { id: 3, label: "3" },
  { id: 4, label: "4" },
  { id: 5, label: "5" },
];

/**
 * Estadísticas del cuadro de mando.
 * **Redes**: 1 por cada red vinculada a la publicación (N:M).
 * **Contenido**: Planificado = sin `contenidoUrl`; Terminado = con URL (`contenidoCreado`).
 */
export function calcularCuadroMandoPublicaciones(
  publicaciones: MktPublicacionCalendarioItem[],
  redes: MktCatalogoNombreItem[]
): MktCuadroMandoStats {
  const porRed = new Map<string, number>();
  for (const p of publicaciones) {
    for (const redId of p.redIds) {
      porRed.set(redId, (porRed.get(redId) ?? 0) + 1);
    }
  }

  const redesStats: MktStatFila[] = redes
    .map((r) => ({
      id: r.id,
      nombre: r.nombre,
      cantidad: porRed.get(r.id) ?? 0,
    }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"));

  let planificado = 0;
  let terminado = 0;
  for (const p of publicaciones) {
    if (p.contenidoCreado) terminado += 1;
    else planificado += 1;
  }

  return {
    redes: redesStats,
    contenido: [
      { id: "planificado", nombre: "PLANIFICADO", cantidad: planificado },
      { id: "terminado", nombre: "TERMINADO", cantidad: terminado },
    ],
  };
}

/** Filtra publicaciones cuyo `fechaIso` cae en mes/año (1–12). */
export function filtrarPublicacionesPorMesAnio(
  publicaciones: MktPublicacionCalendarioItem[],
  mes: number,
  anio: number
): MktPublicacionCalendarioItem[] {
  const prefix = `${anio}-${String(mes).padStart(2, "0")}-`;
  return publicaciones.filter((p) => p.fechaIso.startsWith(prefix));
}

/** Inclusive `[desdeIso, hastaIso]` por comparación de `YYYY-MM-DD`. */
export function filtrarPublicacionesPorRangoIsoYmd(
  publicaciones: MktPublicacionCalendarioItem[],
  desdeIso: string,
  hastaIso: string
): MktPublicacionCalendarioItem[] {
  return publicaciones.filter(
    (p) => p.fechaIso >= desdeIso && p.fechaIso <= hastaIso
  );
}

/**
 * Filtra publicaciones según el mes/semana del calendario.
 * **Todas** = mes civil completo; **1–5** = lun–dom de esa fila de la grilla.
 */
export function filtrarPublicacionesPorVistaCalendario(
  publicaciones: MktPublicacionCalendarioItem[],
  mesVista: MktCalendarioMesAnio,
  semana: MktCuadroMandoSemanaFiltro
): MktPublicacionCalendarioItem[] {
  if (semana === "TODAS") {
    return filtrarPublicacionesPorMesAnio(publicaciones, mesVista.mes, mesVista.anio);
  }
  const semanas = construirSemanasDelMes(mesVista);
  const fila = semanas.find((s) => s.numero === semana);
  if (!fila) return [];
  const domingo = addDaysToIsoYmdArgentina(fila.lunesIso, 6);
  return filtrarPublicacionesPorRangoIsoYmd(publicaciones, fila.lunesIso, domingo);
}
