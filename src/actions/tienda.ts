"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";

// ─── MOCK: sin Prisma ───────────────────────────────────────────────────────

export async function getUltimoSync() {
  return null;
}

/** Datos para la página /tienda. MOCK. */
const MOCK_ITEMS_TIENDA = [
  {
    id: "mock-item-1",
    codItem: "T001",
    descripcion: "Ítem tienda demo",
    rubro: null,
    subRubro: null,
    marca: null,
    proveedorDux: null,
    codigoExterno: null,
    costo: 0,
    porcIva: 21,
    precioLista: 0,
    precioMayorista: 0,
    stockGuaymallen: 0,
    stockMaipu: 0,
    habilitado: true,
    ultimaImpresion: null,
    productoProveedorId: null,
    productoProveedor: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { productos: 0 },
  },
];

export async function getTiendaPageData(params: {
  q?: string;
  rubro?: string;
  subRubro?: string;
  marca?: string;
  habilitado?: string;
  mejorPrecio?: string;
  pagina?: string;
}) {
  const { pagina = "1" } = params;
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const PAGE_SIZE = 50;
  const skip = (paginaNum - 1) * PAGE_SIZE;
  const items = MOCK_ITEMS_TIENDA.slice(skip, skip + PAGE_SIZE);
  const total = MOCK_ITEMS_TIENDA.length;
  return {
    items,
    total,
    marcas: [] as { marca: string | null }[],
    rubros: [] as { rubro: string | null }[],
    subRubros: [] as { subRubro: string | null }[],
    setMejorPrecio: new Set<string>(),
    totalPaginas: Math.ceil(total / PAGE_SIZE),
  };
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
  return { porMarca: [], porRubro: [], porSubRubro: [], individual: [] };
}

export async function convertirEnProveedor(
  itemTiendaId: string,
  productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}
