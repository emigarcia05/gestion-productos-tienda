"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { esEditor } from "@/lib/sesion";
import { calcPxCompraFinal } from "@/lib/calculos";
import type { ActionResult } from "@/lib/types";

export async function getUltimoSync() {
  return prisma.syncLog.findFirst({
    orderBy: { createdAt: "desc" },
  });
}

// ─── Control de Aumentos ───────────────────────────────────────────────────

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
  subiendo:    number;
  bajando:     number;
}

export interface ControlAumentosData {
  porMarca:    GrupoAumento[];
  porRubro:    GrupoAumento[];
  porSubRubro: GrupoAumento[];
  individual:  ItemAumento[];
}

export async function getControlAumentos(): Promise<ControlAumentosData> {
  const [items, productos] = await Promise.all([
    prisma.itemTienda.findMany({
      where: { codigoExterno: { not: null }, costo: { gt: 0 } },
      select: {
        id: true, codItem: true, descripcion: true,
        marca: true, rubro: true, subRubro: true,
        codigoExterno: true, proveedorDux: true, costo: true,
      },
    }),
    prisma.producto.findMany({
      select: {
        codExt: true, precioLista: true,
        descuentoProducto: true, descuentoCantidad: true, cxTransporte: true,
      },
    }),
  ]);

  const productosPorCodExt = new Map(productos.map((p) => [p.codExt, p]));

  const itemsAumento: ItemAumento[] = [];
  for (const item of items) {
    if (!item.codigoExterno) continue;
    const prod = productosPorCodExt.get(item.codigoExterno);
    if (!prod) continue;

    const pxCompraFinal = calcPxCompraFinal(
      prod.precioLista, prod.descuentoProducto, prod.descuentoCantidad, prod.cxTransporte
    );
    const pctAumento = ((pxCompraFinal - item.costo) / item.costo) * 100;

    itemsAumento.push({
      itemId: item.id, codItem: item.codItem, descripcion: item.descripcion,
      marca: item.marca, rubro: item.rubro, subRubro: item.subRubro,
      codigoExterno: item.codigoExterno, proveedorDux: item.proveedorDux,
      costoTienda: item.costo, pxCompraFinal, pctAumento,
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

// ─── Convertir producto en proveedor de un item ────────────────────────────

export async function convertirEnProveedor(
  itemTiendaId: string,
  productoId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

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
        costo:         parseFloat(calcPxCompraFinal(
          producto.precioLista, producto.descuentoProducto,
          producto.descuentoCantidad, producto.cxTransporte
        ).toFixed(2)),
        codigoExterno: producto.codExt,
      },
    });
    revalidatePath("/tienda");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo actualizar el item." };
  }
}
