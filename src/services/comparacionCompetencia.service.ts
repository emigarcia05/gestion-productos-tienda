import type { Prisma } from "@prisma/client";
import { filtroTexto } from "@/lib/busqueda";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";

export interface ProductoTiendaParaComparacionRow {
  id: string;
  codTienda: string;
  descripcionTienda: string;
  marca: string | null;
  rubro: string | null;
}

function buildWhereBusquedaProductosTienda(q: string): Prisma.ProdTiendaWhereInput {
  const andParts: Prisma.ProdTiendaWhereInput[] = [{ compararCompetencia: false }];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) {
    andParts.push(textFilter);
  } else {
    andParts.push(
      { descripcionTienda: { not: null } },
      { descripcionTienda: { not: "" } }
    );
  }
  return { AND: andParts };
}

export async function buscarProductosTiendaParaComparacion(params: {
  q?: string;
  take?: number;
}): Promise<ServiceResult<{ items: ProductoTiendaParaComparacionRow[]; total: number }>> {
  const take = Math.max(1, Math.floor(Number(params.take) || 100));
  const where = buildWhereBusquedaProductosTienda(params.q ?? "");

  try {
    const [rows, total] = await Promise.all([
      prisma.prodTienda.findMany({
        where,
        select: {
          codTienda: true,
          descripcionTienda: true,
          marca: true,
          rubro: true,
        },
        orderBy: [{ descripcionTienda: "asc" }, { codTienda: "asc" }],
        take,
      }),
      prisma.prodTienda.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.codTienda,
          codTienda: r.codTienda,
          descripcionTienda: (r.descripcionTienda ?? "").trim(),
          marca: r.marca,
          rubro: r.rubro,
        })),
        total,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al buscar productos para comparar.",
    };
  }
}

export async function agregarProductoComparacionCompetencia(
  codTienda: string
): Promise<ServiceResult<void>> {
  try {
    const existente = await prisma.prodTienda.findUnique({
      where: { codTienda },
      select: { compararCompetencia: true },
    });
    if (!existente) {
      return { success: false, error: "Producto no encontrado en tienda." };
    }
    if (existente.compararCompetencia) {
      return { success: false, error: "El producto ya está en comparación." };
    }

    await prisma.prodTienda.update({
      where: { codTienda },
      data: { compararCompetencia: true },
    });
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo agregar el producto a comparación.",
    };
  }
}

export async function quitarProductoComparacionCompetencia(
  codTienda: string
): Promise<ServiceResult<void>> {
  try {
    const existente = await prisma.prodTienda.findUnique({
      where: { codTienda },
      select: { compararCompetencia: true },
    });
    if (!existente) {
      return { success: false, error: "Producto no encontrado en tienda." };
    }
    if (!existente.compararCompetencia) {
      return { success: false, error: "El producto no está en comparación." };
    }

    await prisma.prodTienda.update({
      where: { codTienda },
      data: { compararCompetencia: false },
    });
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo quitar el producto de comparación.",
    };
  }
}
