import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

export interface CompetidorPrecioFila {
  competenciaId: string;
  nombre: string;
  prefijo3: string;
  px: number;
  difPctVsTienda: number | null;
}

export interface ResumenPreciosCompetenciaFila {
  pxPromedio: number | null;
  difPctTiendaVsPromedio: number | null;
  menor: CompetidorPrecioFila | null;
  mayor: CompetidorPrecioFila | null;
  competidoresOrdenados: CompetidorPrecioFila[];
}

/** Abreviatura en columnas MENOR/MAYOR PRECIO: `global_proveedores.prefijo` del proveedor del competidor. */
export function abreviaturaCompetidorEnGrilla(c: CompetenciaParaCliente): string {
  const p = c.prefijoProveedor?.trim();
  if (!p) return "—";
  return p.toUpperCase();
}

function difPctVsBase(precio: number, base: number): number | null {
  if (base <= 0) return null;
  return ((precio - base) / base) * 100;
}

/** Competidores con precio a mostrar (scraping OK o Px. Vta. Sugerido vía `aplicarPrioridadPrecioMostrar`). */
export function listarCompetidoresConPrecioOk(
  vinculosPorCompetencia: Record<string, DatoVinculoCompetenciaCliente>,
  competencias: CompetenciaParaCliente[],
  pxListaTienda: number
): CompetidorPrecioFila[] {
  const items: CompetidorPrecioFila[] = [];
  for (const c of competencias) {
    const v = vinculosPorCompetencia[c.id];
    if (v?.pxCompetencia == null || !(v.pxCompetencia > 0)) continue;
    items.push({
      competenciaId: c.id,
      nombre: c.nombre,
      prefijo3: abreviaturaCompetidorEnGrilla(c),
      px: v.pxCompetencia,
      difPctVsTienda: difPctVsBase(v.pxCompetencia, pxListaTienda),
    });
  }
  return items.sort((a, b) => a.px - b.px);
}

export interface CompetidorFalloRelevamientoFila {
  competenciaId: string;
  nombre: string;
  estado: string;
  errorMensaje: string | null;
  relevadoAt: string | null;
}

/** Competidores con URL y último relevamiento en ERROR o SIN_PRECIO (para detalle expandido). */
export function listarCompetidoresConFalloRelevamiento(
  vinculosPorCompetencia: Record<string, DatoVinculoCompetenciaCliente>,
  competencias: CompetenciaParaCliente[]
): CompetidorFalloRelevamientoFila[] {
  const items: CompetidorFalloRelevamientoFila[] = [];
  for (const c of competencias) {
    const v = vinculosPorCompetencia[c.id];
    if (v?.urlBloqueadaPorPxSugerido) continue;
    if (!v?.urlProducto?.trim()) continue;
    if (
      v.estado !== ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR &&
      v.estado !== ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_PRECIO
    ) {
      continue;
    }
    items.push({
      competenciaId: c.id,
      nombre: c.nombre,
      estado: v.estado,
      errorMensaje: v.errorMensaje,
      relevadoAt: v.relevadoAt,
    });
  }
  return items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function calcularResumenPreciosCompetenciaFila(
  vinculosPorCompetencia: Record<string, DatoVinculoCompetenciaCliente>,
  competencias: CompetenciaParaCliente[],
  pxListaTienda: number
): ResumenPreciosCompetenciaFila {
  const competidoresOrdenados = listarCompetidoresConPrecioOk(
    vinculosPorCompetencia,
    competencias,
    pxListaTienda
  );
  if (competidoresOrdenados.length === 0) {
    return {
      pxPromedio: null,
      difPctTiendaVsPromedio: null,
      menor: null,
      mayor: null,
      competidoresOrdenados: [],
    };
  }
  const suma = competidoresOrdenados.reduce((acc, x) => acc + x.px, 0);
  const pxPromedio = Math.round(suma / competidoresOrdenados.length);
  return {
    pxPromedio,
    difPctTiendaVsPromedio: difPctVsBase(pxListaTienda, pxPromedio),
    menor: competidoresOrdenados[0] ?? null,
    mayor: competidoresOrdenados[competidoresOrdenados.length - 1] ?? null,
    competidoresOrdenados,
  };
}
