/**
 * Configuración central de permisos por rol.
 *
 * Cada clave representa un elemento de la UI.
 * Modificá este archivo para controlar qué ve cada rol.
 *
 * Roles disponibles: "simple" | "editor"
 */

export type Rol = "simple" | "editor";

export const PERMISOS = {

  // ─── Página /proveedores (y submódulos en sidebar) ─────────────────────────
  proveedores: {
    /** Acceso a Px Vta. Sugeridos (/proveedores/sugeridos). Solo este submódulo visible para simple. */
    sugeridos:       { simple: true,  editor: true },
    listaPrecios:   { simple: false, editor: true },
    comparacionCat: { simple: false, editor: true },
    lista:           { simple: false, editor: true },
    acciones: {
      nuevoProveedor: { simple: false, editor: true },
      importarLista:  { simple: false, editor: true },
      accionMasiva:   { simple: false, editor: true },
    },
    tabla: {
      codProdProv:         { simple: false, editor: true  },
      codExt:              { simple: false, editor: true  },
      descripcion:         { simple: true,  editor: true  },
      proveedor:           { simple: true,  editor: true  },
      precioLista:         { simple: false, editor: true  },
      precioVentaSugerido: { simple: true,  editor: true  },
      descuentoRubro:      { simple: false, editor: true  },
      descuentoCantidad:   { simple: false, editor: true  },
      cxTransporte:        { simple: false, editor: true  },
      precioCompraFinal:   { simple: false, editor: true  },
      disponible:          { simple: false, editor: true  },
    },
  },

  // ─── Página /proveedores/lista-precios ──────────────────────────────────────
  listaPrecios: {
    acciones: {
      importarLista:   { simple: true,  editor: true },
      edicionMasiva:  { simple: false, editor: true },
    },
  },

  // ─── Página /proveedores/comparacion-categorias ─────────────────────────────
  comparacionCategorias: {
    acceso:  { simple: false, editor: true },
    editar:  { simple: false, editor: true }, // CRUD categorías/subcategorías/presentaciones y asignar productos
  },

  // ─── Página /tienda (y submódulos en sidebar) ──────────────────────────────
  tienda: {
    /** Comp. Px. Prov. (/tienda). */
    acceso: { simple: false, editor: true },
    /** Control Aumentos (/tienda/aumentos). */
    controlAumentos: { simple: false, editor: true },
    acciones: {
      sincronizar: { simple: false, editor: true },
    },
    tabla: {
      codItem:      { simple: false, editor: true },
      descripcion:  { simple: true,  editor: true },
      costo:        { simple: false, editor: true },
      proveedorDux: { simple: false, editor: true },
      rubro:        { simple: true,  editor: true },
      subRubro:     { simple: true,  editor: true },
      mejorPrecio:  { simple: false, editor: true },
      vinculos:     { simple: false, editor: true },
    },
  },

  // ─── Página /stock ────────────────────────────────────────────────────────
  stock: {
    acceso: { simple: true, editor: true },
  },

  // ─── Página /pedidos ──────────────────────────────────────────────────────
  pedidos: {
    acceso: { simple: true, editor: true },
  },

  // ─── Página /importar ─────────────────────────────────────────────────────
  importar: {
    acceso: { simple: false, editor: true },
  },

} as const;

/**
 * Helper para verificar si un rol tiene permiso para un elemento.
 * Uso: puede(rol, PERMISOS.tienda.tabla.costo)
 */
export function puede(rol: Rol, permiso: { simple: boolean; editor: boolean }): boolean {
  return permiso[rol];
}
