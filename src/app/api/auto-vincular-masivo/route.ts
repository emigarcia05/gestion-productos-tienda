import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

/**
 * GET /api/auto-vincular-masivo
 *
 * Proceso de una sola vez: vincula cada ItemTienda con los Productos de Lista
 * Proveedores cuyo codExt coincida con el codigoExterno del item.
 *
 * Ejemplo: ItemTienda.codigoExterno = "ELGARAGE-2161"
 *          Producto.codExt          = "ELG-2161"  ← busca coincidencia parcial
 *
 * Protegido con ?secret=... para evitar ejecuciones accidentales.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.AUTO_VINCULAR_SECRET) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const inicio = Date.now();

  try {
    // Traer todos los items que tienen codigoExterno y aún no tienen vínculos
    const items = await prisma.itemTienda.findMany({
      where: {
        codigoExterno: { not: null },
        productos: { none: {} }, // solo los que no tienen vínculos aún
      },
      select: { id: true, codigoExterno: true, descripcion: true },
    });

    let vinculados = 0;
    let sinCoincidencia = 0;

    for (const item of items) {
      if (!item.codigoExterno) continue;

      // Buscar productos cuyo codExt contenga el codigoExterno del item
      // o viceversa (coincidencia parcial en ambas direcciones)
      const productos = await prisma.producto.findMany({
        where: {
          OR: [
            { codExt:      { contains: item.codigoExterno, mode: "insensitive" } },
            { codProdProv: { contains: item.codigoExterno, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });

      if (productos.length === 0) {
        sinCoincidencia++;
        continue;
      }

      await prisma.itemTiendaProducto.createMany({
        data: productos.map((p) => ({ itemTiendaId: item.id, productoId: p.id })),
        skipDuplicates: true,
      });

      vinculados += productos.length;
    }

    const duracionMs = Date.now() - inicio;

    return NextResponse.json({
      ok: true,
      itemsProcesados: items.length,
      vinculosCreados: vinculados,
      sinCoincidencia,
      duracionMs,
    });

  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
