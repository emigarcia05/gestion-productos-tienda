"use server";

// ─── MOCK: sin Prisma; datos de prueba ──────────────────────────────────────

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

export async function getControlStock(sucursal: Sucursal): Promise<ControlStockData> {
  return { items: [], marcas: [], rubros: [], subRubros: [] };
}

export async function registrarImpresion(ids: string[]): Promise<void> {
  // no-op mock
}
