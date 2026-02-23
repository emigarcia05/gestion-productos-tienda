import { NextResponse } from "next/server";
import { ejecutarSync } from "@/lib/syncTienda";
import { prisma } from "@/lib/prisma";

// Vercel Cron llama a este endpoint con el header Authorization: Bearer <CRON_SECRET>
// También se puede llamar manualmente desde el Server Action

export const maxDuration = 60; // Máximo en plan Hobby de Vercel

export async function GET(request: Request) {
  try {
    const result = await ejecutarSync("auto");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);

    // Guardar el error en el log
    await prisma.syncLog.create({
      data: {
        tipo: "auto",
        status: "error",
        error: mensaje,
      },
    }).catch(() => {}); // no fallar si el log también falla

    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
