import type { InformeAumentosPxExport } from "@/lib/exportPxDiffTypes";
import { calcAumentoPctCostoCompra } from "@/lib/aumentoCostoCompra";
import { listarItemsCostoCxDiff } from "@/services/exportCostoCxDiff.service";

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
 * Informe PDF: mismos ítems que Excel Act. Cx. (`listarItemsCostoCxDiff`),
 * agrupados por marca/rubro (fallback **SIN MARCA** / **SIN RUBRO** si faltan en catálogo).
 */
export async function obtenerInformeAumentosCostos(): Promise<InformeAumentosPxExport> {
  const items = await listarItemsCostoCxDiff();
  const acumulador = new Map<string, AcumuladorRubro>();

  for (const item of items) {
    const pct = calcAumentoPctCostoCompra(item.costoNuevo, item.costoViejo);
    if (pct == null) continue;
    agruparItemInforme(acumulador, item.marca, item.rubro, item.descripcion, pct);
  }

  return buildInforme(acumulador);
}
