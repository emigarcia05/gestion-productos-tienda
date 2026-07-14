import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";

export type MktStatFila = {
  id: string;
  nombre: string;
  cantidad: number;
};

export type MktCuadroMandoStats = {
  redes: MktStatFila[];
  tipos: MktStatFila[];
  contenido: MktStatFila[];
  total: number;
};

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
  redes: MktCatalogoNombreItem[],
  tipos: MktCatalogoNombreItem[]
): MktCuadroMandoStats {
  const porRed = contarPorId(publicaciones, (p) => p.redId);
  const porTipo = contarPorId(publicaciones, (p) => p.tipoPublicacionId);

  const redesStats: MktStatFila[] = redes
    .map((r) => ({
      id: r.id,
      nombre: r.nombre,
      cantidad: porRed.get(r.id) ?? 0,
    }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"));

  const tiposStats: MktStatFila[] = tipos
    .map((t) => ({
      id: t.id,
      nombre: t.nombre,
      cantidad: porTipo.get(t.id) ?? 0,
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
    tipos: tiposStats,
    contenido: [
      { id: "planificado", nombre: "PLANIFICADO", cantidad: planificado },
      { id: "terminado", nombre: "TERMINADO", cantidad: terminado },
    ],
    total: publicaciones.length,
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
