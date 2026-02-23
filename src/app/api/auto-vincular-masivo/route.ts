import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

/**
 * GET /api/auto-vincular-masivo?secret=...
 * Proceso de una sola vez — vincula ItemTienda con Productos por codigoExterno.
 * Usa paginación interna para procesar en lotes y no superar el timeout.
 * Llamar varias veces hasta que devuelva { hayMas: false }.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const LOTE   = 200;

  if (!secret || secret !== process.env.AUTO_VINCULAR_SECRET) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const inicio = Date.now();

  try {
    // Traer todos los Productos de una vez (son pocos miles, caben en memoria)
    const productos = await prisma.producto.findMany({
      select: { id: true, codExt: true, codProdProv: true },
    });

    // Traer items sin vínculos aún, paginados
    const items = await prisma.itemTienda.findMany({
      where: {
        codigoExterno: { not: null },
        productos: { none: {} },
      },
      select: { id: true, codigoExterno: true },
      skip: offset,
      take: LOTE,
    });

    const total = await prisma.itemTienda.count({
      where: { codigoExterno: { not: null }, productos: { none: {} } },
    });

    // Para cada item, buscar UN SOLO producto con coincidencia exacta en codExt o codProdProv
    const vinculos: { itemTiendaId: string; productoId: string }[] = [];

    for (const item of items) {
      const codExt = item.codigoExterno!.toLowerCase().trim();

      // Primero intentar coincidencia exacta con codExt
      let match = productos.find((p) => p.codExt.toLowerCase().trim() === codExt);

      // Si no hay, intentar coincidencia exacta con codProdProv
      if (!match) {
        match = productos.find((p) => p.codProdProv.toLowerCase().trim() === codExt);
      }

      if (match) {
        vinculos.push({ itemTiendaId: item.id, productoId: match.id });
      }
    }

    let creados = 0;
    if (vinculos.length > 0) {
      const res = await prisma.itemTiendaProducto.createMany({
        data: vinculos,
        skipDuplicates: true,
      });
      creados = res.count;
    }

    const procesados = offset + items.length;
    const hayMas = procesados < total;
    const duracionMs = Date.now() - inicio;

    return NextResponse.json({
      ok: true,
      procesados,
      total,
      vinculosCreados: creados,
      hayMas,
      siguienteOffset: hayMas ? procesados : null,
      duracionMs,
    });

  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}

/**
 * DELETE /api/auto-vincular-masivo?secret=...
 * Limpia vínculos múltiples: para cada ItemTienda con más de un vínculo,
 * conserva solo el que tiene coincidencia exacta con codigoExterno,
 * o el primero si no hay coincidencia exacta.
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.AUTO_VINCULAR_SECRET) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    // Traer items con más de un vínculo
    const itemsConMultiples = await prisma.itemTiendaProducto.groupBy({
      by: ["itemTiendaId"],
      _count: { productoId: true },
      having: { productoId: { _count: { gt: 1 } } },
    });

    if (itemsConMultiples.length === 0) {
      return NextResponse.json({ ok: true, limpiados: 0, mensaje: "No hay vínculos múltiples." });
    }

    const idsItems = itemsConMultiples.map((i) => i.itemTiendaId);

    // Traer los items con sus codigosExternos y sus vínculos
    const items = await prisma.itemTienda.findMany({
      where: { id: { in: idsItems } },
      select: {
        id: true,
        codigoExterno: true,
        productos: {
          include: { producto: { select: { id: true, codExt: true, codProdProv: true } } },
        },
      },
    });

    let limpiados = 0;

    for (const item of items) {
      const vinculos = item.productos;
      if (vinculos.length <= 1) continue;

      const codExt = item.codigoExterno?.toLowerCase().trim() ?? "";

      // Buscar el vínculo con coincidencia exacta
      let conservar = vinculos.find(
        (v) =>
          v.producto.codExt.toLowerCase().trim() === codExt ||
          v.producto.codProdProv.toLowerCase().trim() === codExt
      );

      // Si no hay coincidencia exacta, conservar el primero
      if (!conservar) conservar = vinculos[0];

      // Eliminar todos los demás
      const idsEliminar = vinculos
        .filter((v) => v.productoId !== conservar!.productoId)
        .map((v) => v.productoId);

      await prisma.itemTiendaProducto.deleteMany({
        where: {
          itemTiendaId: item.id,
          productoId: { in: idsEliminar },
        },
      });

      limpiados += idsEliminar.length;
    }

    return NextResponse.json({ ok: true, limpiados, itemsAfectados: items.length });

  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
