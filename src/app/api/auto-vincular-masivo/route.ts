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

    // Para cada item, buscar productos que coincidan con su codigoExterno
    const vinculos: { itemTiendaId: string; productoId: string }[] = [];

    for (const item of items) {
      const codExt = item.codigoExterno!.toLowerCase();
      const matches = productos.filter(
        (p) =>
          p.codExt.toLowerCase().includes(codExt) ||
          codExt.includes(p.codExt.toLowerCase()) ||
          p.codProdProv.toLowerCase() === codExt
      );
      for (const p of matches) {
        vinculos.push({ itemTiendaId: item.id, productoId: p.id });
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
