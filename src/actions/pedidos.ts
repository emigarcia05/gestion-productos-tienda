"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

// ─── MOCK: datos para página Pedido Urgente ─────────────────────────────────

const MOCK_PROVEEDORES_PEDIDO = [
  { id: "mock-prov-1", nombre: "Proveedor Demo", prefijo: "DEM" },
  { id: "mock-prov-2", nombre: "Otro Proveedor", prefijo: "OTR" },
];

const MOCK_PRODUCTOS_PEDIDO = [
  {
    id: "mock-prod-1",
    codigoExterno: "DEM-001",
    codProdProv: "001",
    descripcion: "Producto ejemplo 1",
    precioLista: 100,
    precioVentaSugerido: 120,
    proveedorId: "mock-prov-1",
    proveedor: { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", prefijo: "DEM" },
  },
  {
    id: "mock-prod-2",
    codigoExterno: "DEM-002",
    codProdProv: "002",
    descripcion: "Producto ejemplo 2",
    precioLista: 200,
    precioVentaSugerido: 240,
    proveedorId: "mock-prov-1",
    proveedor: { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", prefijo: "DEM" },
  },
];

const EMPTY_PEDIDO_URGENTE = {
  proveedores: MOCK_PROVEEDORES_PEDIDO,
  productos: [] as typeof MOCK_PRODUCTOS_PEDIDO,
  total: 0,
  totalPaginas: 0,
};

/** Datos para la página /pedidos/urgente. Sin filtros no se cargan productos para navegación más rápida. MOCK. */
export async function getPedidoUrgenteData(params: {
  q?: string;
  pagina?: string;
  proveedor?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return EMPTY_PEDIDO_URGENTE;
  }
  const { q = "", proveedor = "", pagina = "1" } = params;
  const sinFiltros = !q && !proveedor;
  if (sinFiltros) {
    return {
      proveedores: MOCK_PROVEEDORES_PEDIDO,
      productos: [],
      total: 0,
      totalPaginas: 0,
    };
  }
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const PAGE_SIZE = 50;
  const skip = (paginaNum - 1) * PAGE_SIZE;
  const productos = MOCK_PRODUCTOS_PEDIDO.slice(skip, skip + PAGE_SIZE);
  const total = MOCK_PRODUCTOS_PEDIDO.length;
  return {
    proveedores: MOCK_PROVEEDORES_PEDIDO,
    productos,
    total,
    totalPaginas: Math.ceil(total / PAGE_SIZE),
  };
}
