import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

/**
 * DELETE /api/reset-vinculos?secret=...
 * Elimina TODOS los vínculos de la tabla items_tienda_productos.
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.AUTO_VINCULAR_SECRET) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { count } = await prisma.itemTiendaProducto.deleteMany({});
    return NextResponse.json({ ok: true, eliminados: count });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
