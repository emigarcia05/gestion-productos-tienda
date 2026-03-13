"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  getListaPreciosParaPedidoUrgente,
  getProveedoresParaPedidoUrgente,
} from "@/services/listaPrecios.service";

export async function getPedidoUrgenteData(params: {
  sucursal?: string;
  q?: string;
  pagina?: string;
  proveedor?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return {
      proveedores: [],
      productos: [],
      total: 0,
      totalPaginas: 0,
    };
  }

  const { sucursal = "", q = "", pagina = "1", proveedor = "" } = params;
  const sucursalValida = sucursal.trim();

  const [proveedores, result] = await Promise.all([
    getProveedoresParaPedidoUrgente(),
    sucursalValida
      ? getListaPreciosParaPedidoUrgente(
          sucursalValida,
          proveedor || undefined,
          q || undefined,
          undefined,
          undefined
        )
      : Promise.resolve({ items: [], total: 0, totalPaginas: 0 }),
  ]);

  return {
    proveedores,
    productos: result.items,
    total: result.total,
    totalPaginas: result.totalPaginas,
  };
}
