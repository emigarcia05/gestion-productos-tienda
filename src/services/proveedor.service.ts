/**
 * Servicio de Proveedores – MODO FRONTEND ONLY (sin base de datos).
 * Datos estáticos para mantener la UI intacta hasta definir nueva arquitectura de BD.
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

export const PROVEEDOR_ERROR = {
  NOMBRE_DUPLICADO: "Ya existe un proveedor con ese nombre.",
  SUFIJO_DUPLICADO: "Ya existe un proveedor con ese sufijo.",
} as const;

/** Lista estática de proveedores para la UI (coherente con productos mock en actions). */
const MOCK_PROVEEDORES: ProveedorListItem[] = [
  { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", sufijo: "DEM", _count: { productosProveedor: 2 } },
  { id: "mock-prov-2", nombre: "Proveedor Ejemplo", codigoUnico: "EJM", sufijo: "EJM", _count: { productosProveedor: 0 } },
];

/**
 * Lista de proveedores (mock). Sin acceso a base de datos.
 */
export async function getProveedores(): Promise<ProveedorListItem[]> {
  return [...MOCK_PROVEEDORES];
}

/**
 * Crear proveedor (mock). No persiste en BD; devuelve éxito para que el formulario no falle.
 */
export async function createProveedor(
  input: CreateProveedorInput
): Promise<{ id: string; codigoUnico: string }> {
  const sufijoNorm = input.sufijo.trim().toUpperCase();
  const id = `mock-${Date.now()}`;
  return { id, codigoUnico: sufijoNorm || id };
}
