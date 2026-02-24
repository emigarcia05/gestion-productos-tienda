"use server";

import { revalidatePath } from "next/cache";
import { ejecutarSync, type SyncResult } from "@/lib/syncTienda";
import { prisma } from "@/lib/prisma";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function sincronizarManual(): Promise<ActionResult<SyncResult>> {
  try {
    const result = await ejecutarSync("manual");
    revalidatePath("/tienda");
    return { ok: true, data: result };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return { ok: false, error: mensaje };
  }
}

export async function getUltimoSync() {
  return prisma.syncLog.findFirst({
    orderBy: { createdAt: "desc" },
  });
}

export interface ItemAumento {
  itemId:        string;
  codItem:       string;
  descripcion:   string;
  marca:         string | null;
  rubro:         string | null;
  subRubro:      string | null;
  codigoExterno: string;
  proveedorDux:  string | null;
  costoTienda:   number;
  pxCompraFinal: number;
  pctAumento:    number; // ((pxCompraFinal - costoTienda) / costoTienda) * 100
}

export interface GrupoAumento {
  nombre:      string;
  cantidad:    number;
  pctPromedio: number;
  subiendo:    number; // cantidad con pctAumento > 0
  bajando:     number; // cantidad con pctAumento < 0
}

export interface ControlAumentosData {
  porMarca:    GrupoAumento[];
  porRubro:    GrupoAumento[];
  porSubRubro: GrupoAumento[];
  individual:  ItemAumento[];
}

export async function getControlAumentos(): Promise<ControlAumentosData> {
  // Traer todos los items con codigoExterno y su producto vinculado que tenga ese codExt
  const items = await prisma.itemTienda.findMany({
    where: {
      codigoExterno: { not: null },
      costo: { gt: 0 },
    },
    select: {
      id: true,
      codItem: true,
      descripcion: true,
      marca: true,
      rubro: true,
      subRubro: true,
      codigoExterno: true,
      proveedorDux: true,
      costo: true,
    },
  });

  // Traer todos los productos indexados por codExt
  const productos = await prisma.producto.findMany({
    select: {
      codExt: true,
      precioLista: true,
      descuentoProducto: true,
      descuentoCantidad: true,
      cxTransporte: true,
    },
  });
  const productosPorCodExt = new Map(productos.map((p) => [p.codExt, p]));

  // Cruzar: solo los items cuyo codigoExterno matchea un producto
  const itemsAumento: ItemAumento[] = [];
  for (const item of items) {
    if (!item.codigoExterno) continue;
    const prod = productosPorCodExt.get(item.codigoExterno);
    if (!prod) continue;

    const pxCompraFinal =
      prod.precioLista *
      (1 - prod.descuentoProducto / 100) *
      (1 - prod.descuentoCantidad / 100) *
      (1 + prod.cxTransporte / 100);

    const pctAumento = ((pxCompraFinal - item.costo) / item.costo) * 100;

    itemsAumento.push({
      itemId:        item.id,
      codItem:       item.codItem,
      descripcion:   item.descripcion,
      marca:         item.marca,
      rubro:         item.rubro,
      subRubro:      item.subRubro,
      codigoExterno: item.codigoExterno,
      proveedorDux:  item.proveedorDux,
      costoTienda:   item.costo,
      pxCompraFinal,
      pctAumento,
    });
  }

  function agrupar(clave: keyof Pick<ItemAumento, "marca" | "rubro" | "subRubro">): GrupoAumento[] {
    const mapa = new Map<string, ItemAumento[]>();
    for (const item of itemsAumento) {
      const k = item[clave] ?? "Sin definir";
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push(item);
    }
    return Array.from(mapa.entries())
      .map(([nombre, lista]) => ({
        nombre,
        cantidad:    lista.length,
        pctPromedio: lista.reduce((s, i) => s + i.pctAumento, 0) / lista.length,
        subiendo:    lista.filter((i) => i.pctAumento > 0.5).length,
        bajando:     lista.filter((i) => i.pctAumento < -0.5).length,
      }))
      .sort((a, b) => b.pctPromedio - a.pctPromedio);
  }

  return {
    porMarca:    agrupar("marca"),
    porRubro:    agrupar("rubro"),
    porSubRubro: agrupar("subRubro"),
    individual:  itemsAumento.sort((a, b) => b.pctAumento - a.pctAumento),
  };
}

export async function convertirEnProveedor(
  itemTiendaId: string,
  productoId: string
): Promise<ActionResult> {
  if (!(await import("@/lib/sesion").then((m) => m.esEditor()))) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    include: { proveedor: { select: { nombre: true } } },
  });

  if (!producto) return { ok: false, error: "Producto no encontrado." };

  try {
    await prisma.itemTienda.update({
      where: { id: itemTiendaId },
      data: {
        proveedorDux:  producto.proveedor.nombre,
        costo:         parseFloat(
          (
            producto.precioLista *
            (1 - producto.descuentoProducto / 100) *
            (1 - producto.descuentoCantidad / 100) *
            (1 + producto.cxTransporte / 100)
          ).toFixed(2)
        ),
        codigoExterno: producto.codExt,
      },
    });
    revalidatePath("/tienda");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo actualizar el item." };
  }
}

// ─── Control de Stock ──────────────────────────────────────────────────────

export type Sucursal = "guaymallen" | "maipu";

export interface ItemStock {
  id:          string;
  codItem:     string;
  descripcion: string;
  marca:       string | null;
  rubro:       string | null;
  subRubro:    string | null;
  stock:       number;
}

export interface ControlStockData {
  items:     ItemStock[];
  marcas:    string[];
  rubros:    string[];
  subRubros: string[];
}

export async function getControlStock(sucursal: Sucursal): Promise<ControlStockData> {
  const campo = sucursal === "guaymallen" ? "stockGuaymallen" : "stockMaipu";

  const [todos, marcasRaw, rubrosRaw, subRubrosRaw] = await Promise.all([
    prisma.itemTienda.findMany({
      where: { habilitado: true },
      orderBy: { descripcion: "asc" },
      select: {
        id:          true,
        codItem:     true,
        descripcion: true,
        marca:       true,
        rubro:       true,
        subRubro:    true,
        stockGuaymallen: true,
        stockMaipu:      true,
      },
    }),
    prisma.itemTienda.findMany({ select: { marca: true },    distinct: ["marca"],    orderBy: { marca: "asc" },    where: { marca:    { not: null }, habilitado: true } }),
    prisma.itemTienda.findMany({ select: { rubro: true },    distinct: ["rubro"],    orderBy: { rubro: "asc" },    where: { rubro:    { not: null }, habilitado: true } }),
    prisma.itemTienda.findMany({ select: { subRubro: true }, distinct: ["subRubro"], orderBy: { subRubro: "asc" }, where: { subRubro: { not: null }, habilitado: true } }),
  ]);

  const items: ItemStock[] = todos.map((i) => ({
    id:          i.id,
    codItem:     i.codItem,
    descripcion: i.descripcion,
    marca:       i.marca,
    rubro:       i.rubro,
    subRubro:    i.subRubro,
    stock:       campo === "stockGuaymallen" ? i.stockGuaymallen : i.stockMaipu,
  }));

  return {
    items,
    marcas:    marcasRaw.map((m) => m.marca!),
    rubros:    rubrosRaw.map((r) => r.rubro!),
    subRubros: subRubrosRaw.map((s) => s.subRubro!),
  };
}
