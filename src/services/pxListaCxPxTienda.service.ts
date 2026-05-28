import { prisma } from "@/lib/prisma";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import {
  PX_LISTA_SELECCION_PROM,
  preciosListaDifierenMasQueMargen,
  type OpcionPxListaCompetidor,
} from "@/lib/cxPxTienda";
import { buildMapPxVtaSugerido } from "@/services/competenciaPxSugerido.service";

export type CompetenciaPxListaCtx = {
  id: string;
  nombre: string;
  idProveedor: string | null;
  prefijoProveedor: string | null;
};

export function etiquetaCompetidorPxLista(
  prefijoProveedor: string | null,
  nombre: string
): string {
  const p = (prefijoProveedor ?? "").trim();
  if (p) return p.toUpperCase();
  return nombre.trim().toUpperCase();
}

export function pxListaMostradoParaSeleccion(
  seleccion: string,
  opciones: OpcionPxListaCompetidor[],
  pxListaTiendaDux: number
): number {
  if (seleccion !== PX_LISTA_SELECCION_PROM) {
    const op = opciones.find((o) => o.competenciaId === seleccion);
    if (op?.px != null && op.px > 0) return op.px;
  }
  const prom = calcularPxPromedioCompetencia(opciones);
  if (prom != null) return prom;
  return pxListaTiendaDux;
}

export function calcularPxPromedioCompetencia(
  opciones: OpcionPxListaCompetidor[]
): number | null {
  const valores = opciones
    .map((o) => o.px)
    .filter((n): n is number => n != null && n > 0);
  if (valores.length === 0) return null;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

/**
 * Competidores con registro en `prod_precios_competencia` o precio sugerido del proveedor asociado.
 */
export async function buildMapOpcionesPxListaPorCodTienda(
  codTiendas: string[],
  competencias: CompetenciaPxListaCtx[]
): Promise<Map<string, OpcionPxListaCompetidor[]>> {
  const map = new Map<string, OpcionPxListaCompetidor[]>();
  for (const cod of codTiendas) map.set(cod, []);

  if (codTiendas.length === 0 || competencias.length === 0) return map;

  const compIds = competencias.map((c) => c.id);
  const idProveedores = [
    ...new Set(
      competencias.map((c) => c.idProveedor).filter((id): id is string => Boolean(id))
    ),
  ];

  const [ppcRows, pxSugeridoMap] = await Promise.all([
    prisma.prodPrecioCompetencia.findMany({
      where: {
        codTienda: { in: codTiendas },
        competenciaId: { in: compIds },
      },
      select: {
        codTienda: true,
        competenciaId: true,
        pxCompetencia: true,
        estado: true,
      },
    }),
    buildMapPxVtaSugerido(codTiendas, idProveedores),
  ]);

  const ppcByKey = new Map<string, (typeof ppcRows)[number]>();
  for (const row of ppcRows) {
    ppcByKey.set(`${row.codTienda}:${row.competenciaId}`, row);
  }

  for (const codTienda of codTiendas) {
    const opciones: OpcionPxListaCompetidor[] = [];
    for (const comp of competencias) {
      const key = `${codTienda}:${comp.id}`;
      const tieneRegistro = ppcByKey.has(key);
      const sugerido = comp.idProveedor
        ? pxSugeridoMap.get(`${codTienda}:${comp.idProveedor}`)
        : undefined;

      if (!tieneRegistro && sugerido == null) continue;

      let px: number | null = null;
      if (sugerido != null) {
        px = sugerido;
      } else {
        const row = ppcByKey.get(key);
        if (
          row?.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.OK &&
          row.pxCompetencia != null
        ) {
          const n = Number(row.pxCompetencia);
          if (Number.isFinite(n) && n > 0) px = Math.round(n);
        }
      }

      opciones.push({
        competenciaId: comp.id,
        etiqueta: etiquetaCompetidorPxLista(comp.prefijoProveedor, comp.nombre),
        px,
      });
    }
    map.set(codTienda, opciones);
  }

  return map;
}

export async function validarCompetenciaPxLista(
  codTienda: string,
  competenciaId: string,
  competencias: CompetenciaPxListaCtx[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const opciones = await buildMapOpcionesPxListaPorCodTienda([codTienda], competencias);
  const lista = opciones.get(codTienda) ?? [];
  if (!lista.some((o) => o.competenciaId === competenciaId)) {
    return {
      ok: false,
      error: "El competidor no tiene registro de precio para este producto.",
    };
  }
  return { ok: true };
}

/** Compara espejo DUX vs PX LISTA con margen % (`CX_PX_DIFF_PRECIO_MARGEN_PCT`). */
export function pxListaTiendaDifiereDeCxPx(pxListaTiendaDux: number, pxListaCxPx: number): boolean {
  return preciosListaDifierenMasQueMargen(pxListaTiendaDux, pxListaCxPx);
}

export async function resolverPxListaCxPxAlGuardar(
  codTienda: string,
  seleccion: string,
  competencias: CompetenciaPxListaCtx[]
): Promise<number | { error: string }> {
  const row = await prisma.listaPrecioTienda.findUnique({
    where: { codTienda },
    select: { pxListaTienda: true },
  });
  if (!row) return { error: "Producto no encontrado." };

  const pxListaTiendaDux = Number(row.pxListaTienda) || 0;
  const opcionesMap = await buildMapOpcionesPxListaPorCodTienda([codTienda], competencias);
  const opciones = opcionesMap.get(codTienda) ?? [];

  if (seleccion !== PX_LISTA_SELECCION_PROM) {
    const valid = await validarCompetenciaPxLista(codTienda, seleccion, competencias);
    if (!valid.ok) return { error: valid.error };
  }

  return pxListaMostradoParaSeleccion(seleccion, opciones, pxListaTiendaDux);
}

export async function guardarPxListaCxPxConfig(
  codTienda: string,
  seleccion: string,
  pxListaCxPx: number,
  competencias: CompetenciaPxListaCtx[]
): Promise<{ success: true } | { success: false; error: string }> {
  if (seleccion !== PX_LISTA_SELECCION_PROM) {
    const valid = await validarCompetenciaPxLista(codTienda, seleccion, competencias);
    if (!valid.ok) return { success: false, error: valid.error };
  }

  try {
    await prisma.listaPrecioTienda.update({
      where: { codTienda },
      data: {
        competenciaIdPxLista: seleccion === PX_LISTA_SELECCION_PROM ? null : seleccion,
        pxListaCxPx,
      },
    });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo guardar.",
    };
  }
}
