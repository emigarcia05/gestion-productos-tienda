/**
 * Servicio de Proveedores – Conexión a Neon/PostgreSQL vía Prisma.
 */
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";

export interface CreateProveedorInput {
  nombre: string;
  prefijo: string;
  idProveedorDux?: string | null;
  whatsapp?: string | null;
  coeficienteTintometrico: number;
  /** Días de vencimiento separados por coma (30,60,…); null si no aplica. */
  plazosPagos?: string | null;
  /**
   * Flag "Proveedor de Mercadería": si `true`, aparece en la lista
   * `/gestion-productos/proveedores/lista` (ver `getProveedoresMercaderia`).
   * Si no se provee, se aplica el DEFAULT del schema final (`false`).
   */
  proveedorMercaderia?: boolean;
}

export interface UpdateProveedorInput {
  id: string;
  nombre: string;
  prefijo: string;
  idProveedorDux?: string | null;
  whatsapp?: string | null;
  coeficienteTintometrico: number;
  plazosPagos?: string | null;
  /** Ver `CreateProveedorInput.proveedorMercaderia`. Undefined = no tocar. */
  proveedorMercaderia?: boolean;
}

export interface UpdateCoeficienteTintometricoInput {
  id: string;
  coeficienteTintometrico: number;
}

export interface ProveedorListItem {
  id: string;
  nombre: string;
  codigoUnico: string;
  prefijo: string;
  /** ID del proveedor en DUX (si está configurado). */
  idProveedorDux: string | null;
  /** Número WhatsApp para envío de pedido (internacional sin +). */
  whatsapp: string | null;
  /** Coeficiente para cálculo tintométrico. */
  coeficienteTintometrico: number;
  /** Plazos de pago en días (ej. 30,60). */
  plazosPagos: string | null;
  /**
   * Flag "proveedor de mercadería". Solo los TRUE se listan en
   * /gestion-productos/proveedores/lista (ver `getProveedoresMercaderia`).
   */
  proveedorMercaderia: boolean;
  /** Cantidad de ítems en precios_proveedores. */
  cantProductos: number;
  /** Cantidad de ítems del proveedor vinculados a lista_precios_tienda. */
  cantProductosProvistos: number;
}

export const PROVEEDOR_ERROR = {
  NOMBRE_DUPLICADO: "Ya existe un proveedor con ese nombre.",
  PREFIJO_DUPLICADO: "Ya existe un proveedor con ese prefijo.",
} as const;

/**
 * Lista de proveedores desde la base de datos con conteos en precios_proveedores y lista_precios_tienda.
 *
 * Devuelve TODOS los proveedores (sin filtrar por `proveedorMercaderia`).
 * Este método alimenta vistas transversales (Px Sugeridos, Lista Px Proveedores,
 * Comparación por Categorías, sincronizaciones, etc.). Para la vista específica
 * "Lista Proveedores" usar `getProveedoresMercaderia()`.
 */
export async function getProveedores(): Promise<ProveedorListItem[]> {
  return listarProveedoresInterno(null);
}

/**
 * Lista únicamente los proveedores con `proveedor_mercaderia = true`.
 * Alimenta /gestion-productos/proveedores/lista (tabla "Lista Proveedores").
 * Usa el índice `proveedores_proveedor_mercaderia_idx` para el filtro.
 */
export async function getProveedoresMercaderia(): Promise<ProveedorListItem[]> {
  return listarProveedoresInterno({ proveedorMercaderia: true });
}

/** Implementación compartida: arma el payload con conteos en una sola pasada. */
async function listarProveedoresInterno(
  where: { proveedorMercaderia?: boolean } | null
): Promise<ProveedorListItem[]> {
  const [rows, provistosByProveedor] = await Promise.all([
    prisma.proveedor.findMany({
      where: where ?? undefined,
      orderBy: { nombre: "asc" },
      include: { _count: { select: { listaPrecios: true } } },
    }),
    prisma.listaPrecioProveedor.groupBy({
      by: ["idProveedor"],
      where: { idListaPrecioTienda: { not: null } },
      _count: { id: true },
    }),
  ]);

  const provistosMap = new Map(
    provistosByProveedor.map((g) => [g.idProveedor, g._count.id])
  );

  return rows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigoUnico: p.codigoUnico,
    prefijo: p.prefijo,
    idProveedorDux: p.idProveedorDux ?? null,
    whatsapp: p.whatsapp ?? null,
    coeficienteTintometrico: Number(p.coeficienteTintometrico),
    plazosPagos: p.plazosPagos ?? null,
    proveedorMercaderia: p.proveedorMercaderia,
    cantProductos: p._count.listaPrecios,
    cantProductosProvistos: provistosMap.get(p.id) ?? 0,
  }));
}

/** Obtiene un proveedor por id (para validaciones sin cargar toda la lista). */
export async function getProveedorById(
  id: string
): Promise<
  Pick<
    ProveedorListItem,
    "id" | "nombre" | "prefijo" | "whatsapp" | "coeficienteTintometrico" | "plazosPagos"
  > | null
> {
  const p = await prisma.proveedor.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      prefijo: true,
      whatsapp: true,
      coeficienteTintometrico: true,
      plazosPagos: true,
    },
  });
  if (!p) return null;
  return {
    ...p,
    coeficienteTintometrico: Number(p.coeficienteTintometrico),
    plazosPagos: p.plazosPagos ?? null,
  };
}

/**
 * Crea un proveedor en la base de datos.
 * codigoUnico se genera a partir del prefijo (normalizado en mayúsculas).
 */
export async function createProveedor(
  input: CreateProveedorInput
): Promise<{ id: string; codigoUnico: string }> {
  const prefijoNorm = input.prefijo.trim().toUpperCase();
  const proveedor = await prisma.proveedor.create({
    data: {
      nombre: input.nombre.trim(),
      prefijo: prefijoNorm,
      codigoUnico: prefijoNorm,
      idProveedorDux: input.idProveedorDux?.trim() || null,
      whatsapp: normalizarWhatsapp(input.whatsapp),
      coeficienteTintometrico: input.coeficienteTintometrico,
      plazosPagos: input.plazosPagos ?? null,
      // Si el caller no lo define, Prisma aplica el DEFAULT del schema (false).
      ...(input.proveedorMercaderia !== undefined && {
        proveedorMercaderia: input.proveedorMercaderia,
      }),
    },
  });
  return { id: proveedor.id, codigoUnico: proveedor.codigoUnico };
}

/**
 * Actualiza un proveedor existente en la base de datos.
 */
export async function updateProveedor(
  input: UpdateProveedorInput
): Promise<void> {
  const prefijoNorm = input.prefijo.trim().toUpperCase();
  await prisma.proveedor.update({
    where: { id: input.id },
    data: {
      nombre: input.nombre.trim(),
      prefijo: prefijoNorm,
      idProveedorDux: input.idProveedorDux?.trim() || null,
      whatsapp: normalizarWhatsapp(input.whatsapp),
      coeficienteTintometrico: input.coeficienteTintometrico,
      plazosPagos: input.plazosPagos ?? null,
      // `undefined` = no tocar el valor existente.
      ...(input.proveedorMercaderia !== undefined && {
        proveedorMercaderia: input.proveedorMercaderia,
      }),
    },
  });
}

/**
 * Actualiza coeficientes tintométricos de múltiples proveedores en una sola transacción.
 */
export async function updateCoeficientesTintometricos(
  items: UpdateCoeficienteTintometricoInput[]
): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.proveedor.update({
        where: { id: item.id },
        data: { coeficienteTintometrico: item.coeficienteTintometrico },
      })
    )
  );
}

/**
 * Elimina un proveedor. Falla si existen referencias con `onDelete: Restrict` (p. ej. historial de pedidos).
 */
export async function deleteProveedor(id: string): Promise<ServiceResult<void>> {
  try {
    await prisma.proveedor.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2003" || code === "P2014") {
      return {
        success: false,
        error:
          "No se puede eliminar: el proveedor tiene pedidos u otros datos vinculados. Quitá esas referencias primero.",
      };
    }
    const message = e instanceof Error ? e.message : "Error al eliminar el proveedor.";
    return { success: false, error: message };
  }
}

/** Normaliza número WhatsApp: solo dígitos, null si queda vacío. */
function normalizarWhatsapp(value: string | null | undefined): string | null {
  if (value == null) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}
