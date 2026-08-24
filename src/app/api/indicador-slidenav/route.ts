import { NextResponse } from "next/server";
import { getRol } from "@/lib/sesion";
import { guardIndicadorSlidenavLectura } from "@/lib/apiRouteAuth";
import {
  conteosIndicadorSlidenavSchema,
  indicadorSlidenavParteSchema,
} from "@/lib/validations/transfDepositos";
import { obtenerIndicadorSlidenav } from "@/services/indicadorSlidenav.service";

/**
 * Pendientes del slidenav. HTTP (no Server Action) para no serializar con
 * Elegir Usuario / aviso de transf. `parte=transf` = solo COUNT de origen.
 */
export async function GET(req: Request) {
  try {
    const denied = await guardIndicadorSlidenavLectura();
    if (denied) return denied;

    const url = new URL(req.url);
    const parsedSucursal = conteosIndicadorSlidenavSchema.safeParse({
      sucursal: url.searchParams.get("sucursal"),
    });
    if (!parsedSucursal.success) {
      return NextResponse.json({ ok: false as const, error: "Datos inválidos." }, { status: 400 });
    }
    const parsedParte = indicadorSlidenavParteSchema.safeParse(
      url.searchParams.get("parte") ?? "completo"
    );
    if (!parsedParte.success) {
      return NextResponse.json({ ok: false as const, error: "Datos inválidos." }, { status: 400 });
    }

    const rol = await getRol();
    const data = await obtenerIndicadorSlidenav({
      rol,
      sucursal: parsedSucursal.data.sucursal,
      incluirPedidos: parsedParte.data === "completo",
    });
    return NextResponse.json({ ok: true as const, data });
  } catch (e) {
    console.error("[api][indicador-slidenav]", e);
    return NextResponse.json(
      { ok: false as const, error: "Error al cargar indicador." },
      { status: 500 }
    );
  }
}
