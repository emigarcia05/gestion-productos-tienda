import { NextResponse } from "next/server";
import { ejecutarSync } from "@/lib/syncTienda";
import { prisma } from "@/lib/prisma";

// Vercel Cron llama a este endpoint con el header Authorization: Bearer <CRON_SECRET>
// También se puede llamar manualmente desde el Server Action

export const maxDuration = 300; // 5 minutos máximo (plan Pro) — en Hobby es 60s

export async function GET(request: Request) {
  // Verificar que viene de Vercel Cron o de nuestra propia app
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
