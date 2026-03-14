import { getPedidoUrgenteData } from "@/actions/pedidos";
import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import FiltrosPedidoUrgente from "@/components/pedidos/FiltrosPedidoUrgente";
import PedidoUrgentePageClient from "@/components/pedidos/PedidoUrgentePageClient";

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
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

  const { q = "", pagina = "1", sucursal = "", proveedor = "", pedido = "" } = await searchParams;
  const sucursalValida: SucursalPedido | "" =
    sucursal === "maipu" ? "maipu" : sucursal === "guaymallen" ? "guaymallen" : "";
  const pedidoValida: "si" | "no" | "" =
    pedido === "si" ? "si" : pedido === "no" ? "no" : "";
  const sinSucursal = !sucursalValida;

  const { proveedores, productos, total, totalPaginas } = await getPedidoUrgenteData({
    sucursal: sucursalValida,
    q,
    pagina,
    proveedor,
    pedido: pedidoValida,
  });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const tienenLosTresFiltros =
    !!sucursalValida && !!proveedor.trim() && (pedidoValida === "si" || pedidoValida === "no");

  const filters = (
    <FiltrosPedidoUrgente
      q={q}
      sucursal={sucursalValida}
      proveedor={proveedor}
      pedido={pedidoValida}
      proveedores={proveedores}
      totalProductos={total}
    />
  );

  return (
    <PedidoUrgentePageClient
      filters={filters}
      productos={productos}
      sucursalValida={sucursalValida}
      sinFiltros={!tienenLosTresFiltros}
      pedidoValida={pedidoValida}
      total={total}
      totalPaginas={totalPaginas}
      paginaNum={paginaNum}
      proveedor={proveedor}
      q={q}
    />
  );
}
