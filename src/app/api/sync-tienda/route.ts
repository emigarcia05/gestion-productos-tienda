import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DUX_BASE_URL, mapItem } from "@/lib/duxApi";

export const maxDuration = 60;

const LIMIT = 50;
export const PAUSA_MS = 5000; // 5 segundos entre páginas para respetar rate limit

// ─── GET /api/sync-tienda?offset=0 ────────────────────────────────────────
// Procesa UNA página de la API y devuelve si hay más páginas.
// El cliente llama en loop hasta que "hayMas" sea false.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const inicio = Date.now();

  try {
    const token = process.env.DUX_API_TOKEN;
    if (!token) {
      return NextResponse.json({ ok: false, error: "DUX_API_TOKEN no configurado." }, { status: 500 });
    }

    // Traer UNA página de la API
    const url = `${DUX_BASE_URL}?limit=${LIMIT}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { accept: "application/json", authorization: token },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Error API Dux: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const results: unknown[] = json.results ?? [];
    const total: number = Number(json.paging?.total ?? results.length);

    if (results.length === 0) {
      return NextResponse.json({ ok: true, hayMas: false, offset, total, procesados: 0, duracionMs: Date.now() - inicio });
    }

    const items = results.map(mapItem);

    // Upsert esta página en la BD
    const codItemsLote = items.map((i) => i.codItem);
    const existentes = await prisma.itemTienda.findMany({
      where: { codItem: { in: codItemsLote } },
      select: { codItem: true },
    });
    const setExistentes = new Set(existentes.map((e) => e.codItem));

    const paraCrear     = items.filter((i) => !setExistentes.has(i.codItem));
    const paraActualizar = items.filter((i) =>  setExistentes.has(i.codItem));

    if (paraCrear.length > 0) {
      await prisma.itemTienda.createMany({ data: paraCrear, skipDuplicates: true });
    }

    if (paraActualizar.length > 0) {
      await Promise.all(
        paraActualizar.map((item) =>
          prisma.itemTienda.update({
            where: { codItem: item.codItem },
            data: {
              descripcion:     item.descripcion,
              rubro:           item.rubro,
              subRubro:        item.subRubro,
              marca:           item.marca,
              proveedorDux:    item.proveedorDux,
              codigoExterno:   item.codigoExterno,
              costo:           item.costo,
              porcIva:         item.porcIva,
              precioLista:     item.precioLista,
              precioMayorista: item.precioMayorista,
              stockGuaymallen: item.stockGuaymallen,
              stockMaipu:      item.stockMaipu,
              habilitado:      item.habilitado,
            },
          })
        )
      );
    }

    const siguienteOffset = offset + LIMIT;
    const hayMas = siguienteOffset < total;

    // En la última página: deshabilitar los que no están en la API
    // (esto lo maneja el cliente llamando a /api/sync-tienda/finalizar)

    return NextResponse.json({
      ok: true,
      hayMas,
      offset: siguienteOffset,
      total,
      procesados: items.length,
      duracionMs: Date.now() - inicio,
    });

  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}

// ─── POST /api/sync-tienda — finalizar sync ────────────────────────────────
// Recibe el timestamp de inicio del sync, deshabilita items no tocados y guarda el log.
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      inicioSync: string;  // ISO timestamp del inicio del sync en el cliente
      totalApi: number;
      duracionMs: number;
    };

    const inicioSync = new Date(body.inicioSync);

    // Items habilitados que NO fueron tocados durante este sync = ya no están en la API
    const { count: deshabilitados } = await prisma.itemTienda.updateMany({
      where: {
        habilitado: true,
        updatedAt: { lt: inicioSync },
      },
      data: { habilitado: false },
    });

    // Contar creados y actualizados desde el inicio del sync
    const creados = await prisma.itemTienda.count({
      where: { createdAt: { gte: inicioSync } },
    });
    const actualizados = await prisma.itemTienda.count({
      where: { updatedAt: { gte: inicioSync }, createdAt: { lt: inicioSync } },
    });

    await prisma.syncLog.create({
      data: {
        tipo: "manual", status: "ok",
        creados,
        actualizados,
        deshabilitados,
        totalApi: body.totalApi,
        duracionMs: body.duracionMs,
      },
    });

    return NextResponse.json({ ok: true, creados, actualizados, deshabilitados });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}

