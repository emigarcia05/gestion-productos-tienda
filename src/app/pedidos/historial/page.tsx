import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { redirect } from "next/navigation";
import * as pedidosHistoriaService from "@/services/pedidosHistoria.service";
import HistorialPedidosPageClient from "@/components/pedidos/HistorialPedidosPageClient";
import { prisma } from "@/lib/prisma";
import type { SucursalPedidoEnvio } from "@/services/pedidosEnvio.service";
import type { PedidoHistoriaEstado } from "@/services/pedidosHistoria.service";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    pagina?: string;
    proveedor?: string;
    sucursal?: string;
    estado?: string;
    q?: string;
  }>;
}

export default async function HistorialPedidosPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");
  const esEditor = rol === "editor";

  const { pagina = "1", proveedor = "", sucursal = "", estado = "", q = "" } =
    await searchParams;
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const qTrim = q.trim();

  const proveedorId = proveedor.trim();
  const sucursalCodigo: SucursalPedidoEnvio | "" =
    sucursal === "maipu" ? "maipu" : sucursal === "guaymallen" ? "guaymallen" : "";

  const estadoParam = estado.trim().toUpperCase();
  /** Sin `estado` en la URL (entrada al módulo): por defecto solo pedidos pendientes de recepción. */
  const estadoFiltro: PedidoHistoriaEstado | "ALL" =
    estadoParam === "RECIBIDO" ? "RECIBIDO" : estadoParam === "ALL" ? "ALL" : "PEDIDO";

  const estadoUi: "PEDIDO" | "RECIBIDO" | "ALL" = estadoFiltro;

  const proveedores = await prisma.proveedor.findMany({
    select: { id: true, nombre: true, prefijo: true },
    orderBy: { prefijo: "asc" },
  });

  const res = await pedidosHistoriaService.listarPedidosHistoria({
    pagina: paginaNum,
    proveedorId: proveedorId || undefined,
    sucursalCodigo: sucursalCodigo || undefined,
    estado: estadoFiltro,
    q: qTrim || undefined,
  });

  if (!res.success) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <HistorialPedidosPageClient
          items={[]}
          total={0}
          totalPaginas={1}
          paginaNum={paginaNum}
          proveedores={proveedores}
          proveedorId={proveedorId}
          sucursalCodigo={sucursalCodigo}
          estado={estadoUi}
          q={qTrim}
          esEditor={esEditor}
        />
      </div>
    );
  }

  const items = res.data.items.map((it) => ({
    ...it,
    generadoAt: it.generadoAt.toISOString(),
    registradoAt: it.registradoAt ? it.registradoAt.toISOString() : null,
  }));

  return (
    <HistorialPedidosPageClient
      items={items}
      total={res.data.total}
      totalPaginas={res.data.totalPaginas}
      paginaNum={res.data.paginaActual}
      proveedores={proveedores}
      proveedorId={proveedorId}
      sucursalCodigo={sucursalCodigo}
      estado={estadoUi}
      q={qTrim}
      esEditor={esEditor}
    />
  );
}
