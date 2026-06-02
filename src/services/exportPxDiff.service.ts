import { roundMarcacionPxLista } from "@/lib/pxListas";
import { prisma } from "@/lib/prisma";
import { buildPxListasItemsDesdeFilas } from "@/services/pxListasRows.service";
import { obtenerMapPxListaConfig } from "@/services/pxListasConfig.service";

const BATCH_SIZE = 150;

export interface FilaExportPx {
  codigo: string;
  /** Marcación de la grilla (columna Excel «Importe»). */
  marcacion: number;
}

export interface RubroAumentoPromedioPx {
  rubro: string;
  aumentoPromedioPct: number;
}

export interface MarcaAumentosPromedioPx {
  marca: string;
  rubros: RubroAumentoPromedioPx[];
}

export interface ResumenAumentosPromedioPxExport {
  marcas: MarcaAumentosPromedioPx[];
}

export interface ExportPxDiffPayload {
  filas: FilaExportPx[];
  resumenAumentos: ResumenAumentosPromedioPxExport;
}

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function pctAumentoPxListaVsDux(pxLista: number, pxDux: number): number | null {
  if (!(pxDux > 0) || !(pxLista > 0)) return null;
  return ((pxLista - pxDux) / pxDux) * 100;
}

function agruparAumentosPromedioPorMarcaRubro(
  acumulador: Map<string, { marca: string; rubro: string; suma: number; cant: number }>,
  marcaRaw: string | null | undefined,
  rubroRaw: string | null | undefined,
  pct: number
): void {
  const marca = marcaRaw?.trim() ?? "";
  const rubro = rubroRaw?.trim() ?? "";
  if (!marca || !rubro) return;
  const key = `${marca}\u0000${rubro}`;
  const prev = acumulador.get(key);
  if (prev) {
    prev.suma += pct;
    prev.cant += 1;
    return;
  }
  acumulador.set(key, { marca, rubro, suma: pct, cant: 1 });
}

function buildResumenDesdeAcumulador(
  acumulador: Map<string, { marca: string; rubro: string; suma: number; cant: number }>
): ResumenAumentosPromedioPxExport {
  const porMarca = new Map<string, RubroAumentoPromedioPx[]>();

  for (const { marca, rubro, suma, cant } of acumulador.values()) {
    const aumentoPromedioPct = suma / cant;
    const rubros = porMarca.get(marca) ?? [];
    rubros.push({ rubro, aumentoPromedioPct });
    porMarca.set(marca, rubros);
  }

  const marcas: MarcaAumentosPromedioPx[] = [...porMarca.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .map(([marca, rubros]) => ({
      marca,
      rubros: rubros.sort((a, b) =>
        a.rubro.localeCompare(b.rubro, "es", { sensitivity: "base" })
      ),
    }));

  return { marcas };
}

/**
 * Exporta ítems cuyo **PX LISTA efectivo** difiere de `px_lista_tienda` en DUX (pesos enteros).
 * La columna Excel **Importe** lleva la **marcación** de la grilla (5 decimales).
 * Además arma el resumen de **aumentos promedio** por marca/rubro (solo ítems con diferencia).
 */
export async function obtenerExportPxDiffPayload(): Promise<ExportPxDiffPayload> {
  const rows = await prisma.prodPrecioTiendaMarcacion.findMany({
    where: { marcacion: { not: null } },
    select: {
      codTienda: true,
      listaPrecioTienda: {
        select: {
          descripcionTienda: true,
          costoCompra: true,
          pxListaTienda: true,
          marca: true,
          rubro: true,
        },
      },
    },
    orderBy: { codTienda: "asc" },
  });

  const filas: FilaExportPx[] = [];
  const acumuladorAumentos = new Map<
    string,
    { marca: string; rubro: string; suma: number; cant: number }
  >();

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const chunk = rows.slice(offset, offset + BATCH_SIZE);
    const codTiendas = chunk.map((r) => r.codTienda);
    const configMap = await obtenerMapPxListaConfig(codTiendas);

    const baseFilas = chunk.map((r) => ({
      codTienda: r.codTienda,
      descripcion: r.listaPrecioTienda.descripcionTienda ?? "",
      costoCompra: toNum(r.listaPrecioTienda.costoCompra),
    }));

    const { items } = await buildPxListasItemsDesdeFilas(baseFilas, configMap);
    const itemPorCod = new Map(items.map((i) => [i.codItem, i]));

    for (const row of chunk) {
      const pxDux = Math.round(toNum(row.listaPrecioTienda.pxListaTienda));
      const item = itemPorCod.get(row.codTienda);
      if (!item) continue;
      const pxLista = item.pxLista;

      if (pxLista == null || !(pxLista > 0) || !(pxDux > 0)) continue;

      if (Math.round(pxLista) === pxDux) continue;

      const marcacion = item.marcacion;
      if (marcacion == null || !(marcacion > 0)) continue;

      filas.push({
        codigo: row.codTienda,
        marcacion: roundMarcacionPxLista(marcacion),
      });

      const pct = pctAumentoPxListaVsDux(pxLista, pxDux);
      if (pct == null) continue;
      agruparAumentosPromedioPorMarcaRubro(
        acumuladorAumentos,
        row.listaPrecioTienda.marca,
        row.listaPrecioTienda.rubro,
        pct
      );
    }
  }

  return {
    filas,
    resumenAumentos: buildResumenDesdeAcumulador(acumuladorAumentos),
  };
}

/** @deprecated Usar `obtenerExportPxDiffPayload`. */
export async function listarFilasExportPxDiff(): Promise<FilaExportPx[]> {
  const { filas } = await obtenerExportPxDiffPayload();
  return filas;
}
