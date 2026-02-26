import { NextResponse } from "next/server";

export const maxDuration = 60;

// ─── MOCK: sin Prisma; respuestas de éxito para que la UI no falle ──────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  return NextResponse.json({
    ok: true,
    hayMas: false,
    offset,
    total: 0,
    procesados: 0,
    duracionMs: 0,
  });
}

export async function POST(req: Request) {
  await req.json();
  return NextResponse.json({ ok: true, creados: 0, actualizados: 0, deshabilitados: 0 });
}
