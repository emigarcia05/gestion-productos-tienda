import type {
  DetalleProductosAumentosPxExport,
  ExportPxDiffPayload,
  FilaExportPx,
  InformeAumentosPxExport,
  MarcaAumentosPromedioPx,
  MarcaDetalleProductosPx,
  ProductoAumentoPxDetalle,
  ResumenAumentosPromedioPxExport,
  RubroAumentoPromedioPx,
  RubroDetalleProductosPx,
} from "@/lib/exportPxDiffTypes";
import { roundMarcacionPxLista } from "@/lib/pxListas";
import { prisma } from "@/lib/prisma";
import { buildPxListasItemsDesdeFilas } from "@/services/pxListasRows.service";
import { obtenerMapPxListaConfig } from "@/services/pxListasConfig.service";

export type {
  DetalleProductosAumentosPxExport,
  ExportPxDiffPayload,
  FilaExportPx,
  InformeAumentosPxExport,
  MarcaAumentosPromedioPx,
  MarcaDetalleProductosPx,
  ProductoAumentoPxDetalle,
  ResumenAumentosPromedioPxExport,
  RubroAumentoPromedioPx,
  RubroDetalleProductosPx,
} from "@/lib/exportPxDiffTypes";

const BATCH_SIZE = 150;

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function pctAumentoPxListaVsDux(pxLista: number, pxDux: number): number | null {
  if (!(pxDux > 0) || !(pxLista > 0)) return null;
  return ((pxLista - pxDux) / pxDux) * 100;
}

type AcumuladorRubro = {
  marca: string;
  rubro: string;
  suma: number;
  cant: number;
  productos: ProductoAumentoPxDetalle[];
};

function agruparItemInformeAumentos(
  acumulador: Map<string, AcumuladorRubro>,
  marcaRaw: string | null | undefined,
  rubroRaw: string | null | undefined,
  descripcionRaw: string | null | undefined,
  pct: number
): void {
  const marca = marcaRaw?.trim() ?? "";
  const rubro = rubroRaw?.trim() ?? "";
  if (!marca || !rubro) return;

  const descripcion = (descripcionRaw?.trim() || "Sin descripción").slice(0, 256);
  const key = `${marca}\u0000${rubro}`;
  const prev = acumulador.get(key);
  if (prev) {
    prev.suma += pct;
    prev.cant += 1;
    prev.productos.push({ descripcion, aumentoPct: pct });
    return;
  }
  acumulador.set(key, {
    marca,
    rubro,
    suma: pct,
    cant: 1,
    productos: [{ descripcion, aumentoPct: pct }],
  });
}

function buildInformeDesdeAcumulador(
  acumulador: Map<string, AcumuladorRubro>
): InformeAumentosPxExport {
  const porMarcaResumen = new Map<string, RubroAumentoPromedioPx[]>();
  const porMarcaDetalle = new Map<string, RubroDetalleProductosPx[]>();

  for (const { marca, rubro, suma, cant, productos } of acumulador.values()) {
    const aumentoPromedioPct = suma / cant;

    const rubrosResumen = porMarcaResumen.get(marca) ?? [];
    rubrosResumen.push({ rubro, aumentoPromedioPct });
    porMarcaResumen.set(marca, rubrosResumen);

    const productosOrdenados = [...productos].sort((a, b) =>
      a.descripcion.localeCompare(b.descripcion, "es", { sensitivity: "base" })
    );
    const rubrosDetalle = porMarcaDetalle.get(marca) ?? [];
    rubrosDetalle.push({ rubro, productos: productosOrdenados });
    porMarcaDetalle.set(marca, rubrosDetalle);
  }

  const sortRubros = <T extends { rubro: string }>(rubros: T[]) =>
    rubros.sort((a, b) => a.rubro.localeCompare(b.rubro, "es", { sensitivity: "base" }));

  const marcasResumen: MarcaAumentosPromedioPx[] = [...porMarcaResumen.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .map(([marca, rubros]) => ({ marca, rubros: sortRubros(rubros) }));

  const marcasDetalle: MarcaDetalleProductosPx[] = [...porMarcaDetalle.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .map(([marca, rubros]) => ({ marca, rubros: sortRubros(rubros) }));

  return {
    resumen: { marcas: marcasResumen },
    detalleProductos: { marcas: marcasDetalle },
  };
}

/**
 * Exporta ítems cuyo **PX LISTA efectivo** difiere de `px_lista_tienda` en DUX (pesos enteros).
 * La columna Excel **Importe** lleva la **marcación** de la grilla (5 decimales).
 * Además arma resumen y detalle para el PDF de aumentos.
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
  const acumuladorAumentos = new Map<string, AcumuladorRubro>();

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
      agruparItemInformeAumentos(
        acumuladorAumentos,
        row.listaPrecioTienda.marca,
        row.listaPrecioTienda.rubro,
        row.listaPrecioTienda.descripcionTienda,
        pct
      );
    }
  }

  return {
    filas,
    informeAumentos: buildInformeDesdeAcumulador(acumuladorAumentos),
  };
}

/** @deprecated Usar `obtenerExportPxDiffPayload`. */
export async function listarFilasExportPxDiff(): Promise<FilaExportPx[]> {
  const { filas } = await obtenerExportPxDiffPayload();
  return filas;
}
