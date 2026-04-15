import { getPedidoUrgenteData } from "@/actions/pedidos";
import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import FiltrosPedidoUrgente from "@/components/pedidos/FiltrosPedidoUrgente";
import PedidoUrgentePageClient from "@/components/pedidos/PedidoUrgentePageClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SucursalPedido = "guaymallen" | "maipu";

interface Props {
  searchParams: Promise<{
    q?: string;
    pagina?: string;
    sucursal?: string;
    proveedor?: string;
    pedido?: string;
  }>;
}

export default async function PedidoUrgentePage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/gestion-productos/proveedores");

  const { q = "", pagina = "1", sucursal = "", proveedor = "", pedido = "" } = await searchParams;
  const sucursalesPedido = await prisma.sucursal.findMany({
    where: { pedido: true, codigo: { in: ["guaymallen", "maipu"] } },
    select: { codigo: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  const sucursalesDisponibles = sucursalesPedido.map((s) => ({
    value: s.codigo as SucursalPedido,
    label: s.nombre.toUpperCase(),
  }));
  const codigosHabilitados = new Set(sucursalesPedido.map((s) => s.codigo));
  const sucursalValida: SucursalPedido | "" =
    (sucursal === "maipu" || sucursal === "guaymallen") && codigosHabilitados.has(sucursal)
      ? (sucursal as SucursalPedido)
      : "";
  const pedidoValida: "cualquier" | "urgente" | "reposicion" | "" =
    pedido === "cualquier"
      ? "cualquier"
      : pedido === "urgente"
        ? "urgente"
        : pedido === "reposicion"
          ? "reposicion"
          : "";

  const { proveedores, productos, total, totalPaginas } = await getPedidoUrgenteData({
    sucursal: sucursalValida,
    q,
    pagina,
    proveedor,
    pedido: pedidoValida,
  });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const tieneSucursalSeleccionada = !!sucursalValida;

  const filters = (
    <FiltrosPedidoUrgente
      q={q}
      sucursal={sucursalValida}
      proveedor={proveedor}
      pedido={pedidoValida}
      proveedores={proveedores}
      sucursales={sucursalesDisponibles}
      totalProductos={total}
    />
  );

  return (
    <PedidoUrgentePageClient
      filters={filters}
      productos={productos}
      proveedores={proveedores}
      sucursalValida={sucursalValida}
      sinFiltros={!tieneSucursalSeleccionada}
      pedidoValida={pedidoValida}
      total={total}
      totalPaginas={totalPaginas}
      paginaNum={paginaNum}
      proveedor={proveedor}
      q={q}
    />
  );
}
