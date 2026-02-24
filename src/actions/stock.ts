"use server";

import { prisma } from "@/lib/prisma";

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type Sucursal = "guaymallen" | "maipu";

export interface ItemStock {
  id:              string;
  codItem:         string;
  descripcion:     string;
  marca:           string | null;
  rubro:           string | null;
  subRubro:        string | null;
  stock:           number;
  ultimaImpresion: Date | null;
}

export interface ControlStockData {
  items:     ItemStock[];
  marcas:    string[];
  rubros:    string[];
  subRubros: string[];
}

// ─── Queries ───────────────────────────────────────────────────────────────

export async function getControlStock(sucursal: Sucursal): Promise<ControlStockData> {
  const todos = await prisma.itemTienda.findMany({
    where: { habilitado: true },
    orderBy: { descripcion: "asc" },
    select: {
      id: true, codItem: true, descripcion: true,
      marca: true, rubro: true, subRubro: true,
      stockGuaymallen: true, stockMaipu: true,
      ultimaImpresion: true,
    },
  });

  // Extraer valores únicos directamente del array ya cargado (evita 3 queries extra)
  const marcas    = [...new Set(todos.map((i) => i.marca).filter(Boolean) as string[])].sort();
  const rubros    = [...new Set(todos.map((i) => i.rubro).filter(Boolean) as string[])].sort();
  const subRubros = [...new Set(todos.map((i) => i.subRubro).filter(Boolean) as string[])].sort();

  const items: ItemStock[] = todos.map((i) => ({
    id:              i.id,
    codItem:         i.codItem,
    descripcion:     i.descripcion,
    marca:           i.marca,
    rubro:           i.rubro,
    subRubro:        i.subRubro,
    stock:           sucursal === "guaymallen" ? i.stockGuaymallen : i.stockMaipu,
    ultimaImpresion: i.ultimaImpresion,
  }));

  return { items, marcas, rubros, subRubros };
}

// ─── Mutaciones ────────────────────────────────────────────────────────────

export async function registrarImpresion(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await prisma.itemTienda.updateMany({
    where: { id: { in: ids } },
    data:  { ultimaImpresion: new Date() },
  });
}
