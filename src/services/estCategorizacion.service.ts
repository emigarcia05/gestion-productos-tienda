import { prisma } from "@/lib/prisma";
import type { EstCategorizacionItem } from "@/lib/estCategorizacionTypes";
import { matchColoresEnDescripcion } from "@/lib/estPorProdColores";
import { resolverLitrosDesdeDescripcion } from "@/lib/estPorProdLitros";
import { listarEstPorProdColores } from "@/services/estPorProdColores.service";
import { listarEstPorProdLtsConversiones } from "@/services/estPorProdLtsConversion.service";

function upperOrEmpty(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleUpperCase("es-AR");
}

/** Listado de `prod_tienda` con color y litros derivados de la descripción. */
export async function listarProdTiendaCategorizacion(): Promise<EstCategorizacionItem[]> {
  try {
    const [rows, colores, conversionesLts] = await Promise.all([
      prisma.prodTienda.findMany({
        select: {
          codTienda: true,
          descripcionTienda: true,
          marca: true,
          rubro: true,
          subRubro: true,
        },
        orderBy: [{ descripcionTienda: "asc" }, { codTienda: "asc" }],
      }),
      listarEstPorProdColores(),
      listarEstPorProdLtsConversiones(),
    ]);

    return rows.map((r) => {
      const descripcionTienda = (r.descripcionTienda ?? "").trim();
      const matched = matchColoresEnDescripcion(descripcionTienda, colores);
      const coloresNombres = matched.map((c) => c.nombre);
      return {
        codTienda: r.codTienda,
        descripcionTienda,
        marca: upperOrEmpty(r.marca),
        rubro: upperOrEmpty(r.rubro),
        subRubro: upperOrEmpty(r.subRubro),
        colores: coloresNombres,
        colorEtiqueta: coloresNombres.join(" · "),
        lts: resolverLitrosDesdeDescripcion(descripcionTienda, conversionesLts),
      };
    });
  } catch (e: unknown) {
    console.error("[estCategorizacion.service] listarProdTiendaCategorizacion:", e);
    return [];
  }
}
