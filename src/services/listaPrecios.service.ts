/**
 * Servicio lista_precios_proveedores – Capa de datos.
 * MOCK: almacén en memoria; al conectar Neon/Prisma usar upsert por ID compuesto
 * [sufijo]-[codProdProv].
 */

import type { FilaListaPrecio } from "@/lib/parsearImport";

export interface ItemListaPrecio {
  id: string;
  proveedorId: string;
  codigoExterno: string;
  codProdProv: string;
  descripcion: string;
  /** Nuevo nombre de columna en BD: lista_precios_proveedores.descripcion_proveedor */
  descripcionProveedor: string;
  precioLista: number;
  precioVentaSugerido: number;
  descuentoProducto: number;
  descuentoCantidad: number;
  cxTransporte: number;
  disponible: boolean;
}

export interface UpsertListaPreciosResult {
  creados: number;
  actualizados: number;
  errores: string[];
}

const DEFAULT_DESCUENTO = 0;
const DEFAULT_CX_TRANSPORTE = 0;
const DEFAULT_DISPONIBLE = true;

// ─── MOCK: almacén en memoria (reemplazar por Prisma) ───────────────────────

const store = new Map<string, ItemListaPrecio>();

function idCompuesto(sufijo: string, codProdProv: string): string {
  return `${sufijo}-${codProdProv}`;
}

/**
 * Upsert de filas en lista_precios_proveedores.
 * ID primario: [sufijo]-[codProdProv].
 * Si existe, actualiza; si no, crea con valores por defecto para
 * descuentoProducto (0), descuentoCantidad (0), cxTransporte (0), disponible (true).
 */
export async function upsertListaPrecios(
  proveedorId: string,
  sufijo: string,
  filas: FilaListaPrecio[]
): Promise<UpsertListaPreciosResult> {
  let creados = 0;
  let actualizados = 0;
  const errores: string[] = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const id = idCompuesto(sufijo, fila.codProdProv);

    try {
      const existente = store.get(id);
      const item: ItemListaPrecio = {
        id,
        proveedorId,
        codigoExterno: fila.codigoExterno,
        codProdProv: fila.codProdProv,
        descripcion: fila.descripcion,
        descripcionProveedor: fila.descripcion,
        precioLista: fila.precioLista,
        precioVentaSugerido: fila.precioVentaSugerido,
        descuentoProducto: DEFAULT_DESCUENTO,
        descuentoCantidad: DEFAULT_DESCUENTO,
        cxTransporte: DEFAULT_CX_TRANSPORTE,
        disponible: DEFAULT_DISPONIBLE,
      };

      if (existente) {
        store.set(id, { ...existente, ...item });
        actualizados++;
      } else {
        store.set(id, item);
        creados++;
      }
    } catch (e) {
      errores.push(`Fila ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { creados, actualizados, errores };
}
