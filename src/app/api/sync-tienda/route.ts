import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function GET() {
  const inicio = Date.now();

  try {
    const token = process.env.DUX_API_TOKEN;
    if (!token) {
      return NextResponse.json({ ok: false, error: "DUX_API_TOKEN no configurado." }, { status: 500 });
    }

    // 1. Traer todos los items de la API
    const items = await fetchTodosLosItems(token);
    if (items.length === 0) {
      return NextResponse.json({ ok: false, error: "La API no devolvió ningún item." }, { status: 500 });
    }

    const codItemsApi = items.map((i) => i.codItem);

    // 2. Saber cuáles ya existen en la BD
    const existentes = await prisma.itemTienda.findMany({ select: { codItem: true } });
    const setExistentes = new Set(existentes.map((e) => e.codItem));

    const paraCrear     = items.filter((i) => !setExistentes.has(i.codItem));
    const paraActualizar = items.filter((i) =>  setExistentes.has(i.codItem));

    // 3. Crear nuevos en lotes de 500 (createMany es muy rápido)
    let creados = 0;
    for (let i = 0; i < paraCrear.length; i += 500) {
      const lote = paraCrear.slice(i, i + 500);
      const res = await prisma.itemTienda.createMany({ data: lote, skipDuplicates: true });
      creados += res.count;
    }

    // 4. Actualizar existentes en paralelo — lotes de 300 para no saturar el pool
    let actualizados = 0;
    const LOTE_UPDATE = 300;
    for (let i = 0; i < paraActualizar.length; i += LOTE_UPDATE) {
      const lote = paraActualizar.slice(i, i + LOTE_UPDATE);
      await Promise.all(
        lote.map((item) =>
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
      actualizados += lote.length;
    }

    // 5. Deshabilitar los que ya no están en la API
    const { count: deshabilitados } = await prisma.itemTienda.updateMany({
      where: { codItem: { notIn: codItemsApi }, habilitado: true },
      data: { habilitado: false },
    });

    const duracionMs = Date.now() - inicio;

    await prisma.syncLog.create({
      data: {
        tipo: "manual", status: "ok",
        creados, actualizados, deshabilitados,
        totalApi: items.length, duracionMs,
      },
    });

    return NextResponse.json({ ok: true, creados, actualizados, deshabilitados, totalApi: items.length, duracionMs });

  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    await prisma.syncLog.create({
      data: { tipo: "manual", status: "error", error: mensaje },
    }).catch(() => {});
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}

// ─── Cliente API Dux ───────────────────────────────────────────────────────

const ID_PRECIO_LISTA     = 56994;
const ID_PRECIO_MAYORISTA = 57160;
const ID_STOCK_GUAYMALLEN = 4565;
const ID_STOCK_MAIPU      = 16923;

function parseNum(val: unknown): number {
  const n = parseFloat(String(val ?? "0"));
  return isNaN(n) ? 0 : n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(raw: any) {
  const precioMap: Record<number, number> = {};
  if (Array.isArray(raw.precios)) {
    for (const p of raw.precios) precioMap[p.id] = parseNum(p.precio);
  }
  const stockMap: Record<number, number> = {};
  if (Array.isArray(raw.stock)) {
    for (const s of raw.stock) stockMap[s.id] = parseNum(s.stock_real);
  }

  return {
    codItem:         String(raw.cod_item),
    descripcion:     String(raw.item ?? ""),
    rubro:           (raw.rubro?.nombre   ?? null) as string | null,
    subRubro:        (raw.sub_rubro?.nombre ?? null) as string | null,
    marca:           (raw.marca?.marca    ?? null) as string | null,
    proveedorDux:    (raw.proveedor?.proveedor ?? null) as string | null,
    codigoExterno:   (raw.codigo_externo  ?? null) as string | null,
    costo:           parseNum(raw.costo),
    porcIva:         parseNum(raw.porc_iva),
    precioLista:     precioMap[ID_PRECIO_LISTA]     ?? 0,
    precioMayorista: precioMap[ID_PRECIO_MAYORISTA] ?? 0,
    stockGuaymallen: stockMap[ID_STOCK_GUAYMALLEN]  ?? 0,
    stockMaipu:      stockMap[ID_STOCK_MAIPU]        ?? 0,
    habilitado:      raw.habilitado === "S",
  };
}

async function fetchTodosLosItems(token: string) {
  const todos = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url = `https://erp.duxsoftware.com.ar/WSERP/rest/services/items?limit=1000&offset=${offset}`;
    const res = await fetch(url, {
      headers: { accept: "application/json", authorization: token },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Error API Dux: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const results: unknown[] = json.results ?? [];
    total = Number(json.paging?.total ?? results.length);

    if (results.length === 0) break;
    todos.push(...results.map(mapItem));
    offset += 1000;

    // Si ya tenemos todos, salir
    if (todos.length >= total) break;
  }

  return todos;
}
