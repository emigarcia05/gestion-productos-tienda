import type { InformeAumentosPxExport } from "@/lib/exportPxDiffTypes";
import {
  calcAumentoPctCostoCompra,
  costosCompraDifierenParaInforme,
} from "@/lib/aumentoCostoCompra";
import { prisma } from "@/lib/prisma";

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

type AcumuladorRubro = {
  marca: string;
  rubro: string;
  suma: number;
  cant: number;
  productos: { descripcion: string; aumentoPct: number }[];
};

function agruparItemInforme(
  acumulador: Map<string, AcumuladorRubro>,
  marca: string,
  rubro: string,
  descripcion: string,
  pct: number
): void {
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

function buildInforme(acumulador: Map<string, AcumuladorRubro>): InformeAumentosPxExport {
  const porMarcaResumen = new Map<
    string,
    { rubro: string; aumentoPromedioPct: number }[]
  >();
  const porMarcaDetalle = new Map<
    string,
    { rubro: string; productos: { descripcion: string; aumentoPct: number }[] }[]
  >();

  for (const { marca, rubro, suma, cant, productos } of acumulador.values()) {
    const rubrosResumen = porMarcaResumen.get(marca) ?? [];
    rubrosResumen.push({ rubro, aumentoPromedioPct: suma / cant });
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

  return {
    resumen: {
      marcas: [...porMarcaResumen.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }))
        .map(([marca, rubros]) => ({ marca, rubros: sortRubros(rubros) })),
    },
    detalleProductos: {
      marcas: [...porMarcaDetalle.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }))
        .map(([marca, rubros]) => ({ marca, rubros: sortRubros(rubros) })),
    },
  };
}

/**
 * Informe PDF: cada `prod_precios_tienda` con `costo_compra_cod_ext` vs
 * `prod_precios_provee.px_compra_final_sin_iva` (costo nuevo).
 * Costo viejo = `prod_precios_tienda.costo_compra`.
 * Solo ítems con diferencia de costo y marca/rubro informados.
 */
export async function obtenerInformeAumentosCostos(): Promise<InformeAumentosPxExport> {
  const rows = await prisma.prodTienda.findMany({
    where: {
      costoCompraCodExt: { not: null },
      marca: { not: null },
      rubro: { not: null },
    },
    select: {
      codTienda: true,
      descripcionTienda: true,
      marca: true,
      rubro: true,
      costoCompra: true,
      costoCompraCodExt: true,
      costoListaProveedor: {
        select: { pxCompraFinalSinIva: true },
      },
    },
    orderBy: { codTienda: "asc" },
  });

  const acumulador = new Map<string, AcumuladorRubro>();

  for (const row of rows) {
    const codExt = row.costoCompraCodExt?.trim();
    if (!codExt || !row.costoListaProveedor) continue;

    const costoViejo = toNum(row.costoCompra);
    const costoNuevo = toNum(row.costoListaProveedor.pxCompraFinalSinIva);
    if (!costosCompraDifierenParaInforme(costoViejo, costoNuevo)) continue;

    const pct = calcAumentoPctCostoCompra(costoNuevo, costoViejo);
    if (pct == null) continue;

    const marca = row.marca?.trim() ?? "";
    const rubro = row.rubro?.trim() ?? "";
    if (!marca || !rubro) continue;

    const descripcion = (row.descripcionTienda?.trim() || "Sin descripción").slice(0, 256);
    agruparItemInforme(acumulador, marca, rubro, descripcion, pct);
  }

  return buildInforme(acumulador);
}
