import { addDaysToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import {
  lunesSemanaActualArgentina,
  mesAnioActualArgentina,
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

/** Periodo de los indicadores del cuadro de mando (calendario AR). */
export type MktCuadroMandoPeriodo = "este_mes" | "esta_semana" | "siguiente_semana";

export const MKT_CUADRO_MANDO_PERIODOS: ReadonlyArray<{
  id: MktCuadroMandoPeriodo;
  label: string;
}> = [
  { id: "este_mes", label: "Este Mes" },
  { id: "esta_semana", label: "Esta Semana" },
  { id: "siguiente_semana", label: "Siguiente Semana" },
];

function contarPorId(
  items: MktPublicacionCalendarioItem[],
  getId: (p: MktPublicacionCalendarioItem) => string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of items) {
    const id = getId(p);
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

/**
 * Estadísticas del cuadro de mando.
 * **Contenido**: Planificado = `contenidoCreado === false`; Terminado = `true`.
 */
export function calcularCuadroMandoPublicaciones(
  publicaciones: MktPublicacionCalendarioItem[],
  redes: MktCatalogoNombreItem[]
): MktCuadroMandoStats {
  const porRed = contarPorId(publicaciones, (p) => p.redId);

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
 * Filtra hechos del cuadro de mando según periodo (zona AR).
 * Semana = lunes–domingo; **siguiente_semana** = semana que empieza el próximo lunes.
 */
export function filtrarPublicacionesPorPeriodoCuadroMando(
  publicaciones: MktPublicacionCalendarioItem[],
  periodo: MktCuadroMandoPeriodo,
  ahora: Date = new Date()
): MktPublicacionCalendarioItem[] {
  if (periodo === "este_mes") {
    const { mes, anio } = mesAnioActualArgentina(ahora);
    return filtrarPublicacionesPorMesAnio(publicaciones, mes, anio);
  }

  const lunesActual = lunesSemanaActualArgentina(ahora);
  const lunes =
    periodo === "esta_semana"
      ? lunesActual
      : addDaysToIsoYmdArgentina(lunesActual, 7);
  const domingo = addDaysToIsoYmdArgentina(lunes, 6);
  return filtrarPublicacionesPorRangoIsoYmd(publicaciones, lunes, domingo);
}
