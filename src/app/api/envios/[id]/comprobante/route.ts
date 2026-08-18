import { NextResponse } from "next/server";
import { guardEnviosLectura } from "@/lib/apiRouteAuth";
import { prismaCuidSchema } from "@/lib/validations/common";
import { getEnviosFinalPdfComprobante } from "@/services/enviosFinal.service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await guardEnviosLectura();
    if (denied) return denied;

    const { id } = await ctx.params;
    const parsedId = prismaCuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ ok: false as const, error: "ID de envío inválido." }, { status: 400 });
    }

    const res = await getEnviosFinalPdfComprobante(parsedId.data);
    if (!res.success) {
      return NextResponse.json({ ok: false as const, error: res.error }, { status: 404 });
    }

    const filename = res.data.nombre.replace(/[\r\n"]/g, "_");
    return new NextResponse(new Uint8Array(res.data.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[api][envios][comprobante]", e);
    return NextResponse.json(
      { ok: false as const, error: "No se pudo obtener el comprobante." },
      { status: 500 }
    );
  }
}
