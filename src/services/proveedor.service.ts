/**
 * Servicio de Proveedores – Capa de datos.
 * MOCK: datos en memoria; al conectar Neon/Prisma reemplazar por prisma.proveedor.create
 * y capturar P2002 (unique) para mensajes amigables.
 */

export interface CreateProveedorInput {
  nombre: string;
  sufijo: string;
}

export interface ProveedorListItem {
  id: string;
  nombre: string;
  codigoUnico: string;
  sufijo: string;
  _count: { productosProveedor: number };
}

// ─── MOCK: almacén en memoria (single source para lista + create) ───────────

const store: ProveedorListItem[] = [
  { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", sufijo: "DEM", _count: { productosProveedor: 2 } },
  { id: "mock-prov-2", nombre: "Otro Proveedor", codigoUnico: "OTR", sufijo: "OTR", _count: { productosProveedor: 0 } },
];

/** Códigos de error para constraint unique (Neon/Prisma P2002). */
export const PROVEEDOR_ERROR = {
  NOMBRE_DUPLICADO: "Ya existe un proveedor con ese nombre.",
  SUFIJO_DUPLICADO: "Ya existe un proveedor con ese sufijo.",
} as const;

/**
 * Lista de proveedores (para reutilizar en acciones y revalidación).
 * Con Prisma: return prisma.proveedor.findMany({ include: { _count: { select: { productosProveedor: true } } } });
 */
export async function getProveedores(): Promise<ProveedorListItem[]> {
  return [...store];
}

/**
 * Crea un proveedor. Lanza error con mensaje amigable si nombre o sufijo ya existen (unique).
 * Con Prisma: usar prisma.proveedor.create y en catch (e.code === 'P2002') devolver PROVEEDOR_ERROR según meta.target.
 */
export async function createProveedor(
  input: CreateProveedorInput
): Promise<{ id: string; codigoUnico: string }> {
  const nombreNorm = input.nombre.trim();
  const sufijoNorm = input.sufijo.trim().toUpperCase();

  const nombreExiste = store.some((p) => p.nombre.toLowerCase() === nombreNorm.toLowerCase());
  if (nombreExiste) throw new Error(PROVEEDOR_ERROR.NOMBRE_DUPLICADO);

  const sufijoExiste = store.some((p) => p.sufijo === sufijoNorm);
  if (sufijoExiste) throw new Error(PROVEEDOR_ERROR.SUFIJO_DUPLICADO);

  const id = "mock-prov-" + Date.now();
  const codigoUnico = sufijoNorm;
  store.push({
    id,
    nombre: nombreNorm,
    codigoUnico,
    sufijo: sufijoNorm,
    _count: { productosProveedor: 0 },
  });

  return { id, codigoUnico };
}
