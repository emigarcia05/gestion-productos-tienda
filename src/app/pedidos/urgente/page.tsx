import { getPedidoUrgenteData } from "@/actions/pedidos";
import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosPedidoUrgente from "@/components/pedidos/FiltrosPedidoUrgente";
import GenerarPedidoButton from "@/components/pedidos/GenerarPedidoButton";

export const dynamic = "force-dynamic";

type SucursalPedido = "guaymallen" | "maipu";

interface Props {
  searchParams: Promise<{
    q?: string;
    sucursal?: string;
    proveedor?: string;
    pedido?: string;
  }>;
}

export default async function PedidoUrgentePage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

  const { q = "", sucursal = "", proveedor = "", pedido = "" } = await searchParams;
  const sucursalValida: SucursalPedido | "" =
    sucursal === "maipu" ? "maipu" : sucursal === "guaymallen" ? "guaymallen" : "";
  const pedidoValida: "si" | "no" | "" =
    pedido === "si" ? "si" : pedido === "no" ? "no" : "";

  const { proveedores, total } = await getPedidoUrgenteData({
    sucursal: sucursalValida,
    q,
    pagina: "1",
    proveedor,
  });

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
    <ClassicFilteredTableLayout
      title="Pedido Mercadería"
      subtitle="Pedido Urgente"
      actions={<GenerarPedidoButton />}
      filters={filters}
    >
      <div className="flex flex-col h-full min-h-0 rounded-xl border border-border bg-card p-6">
        <p className="text-muted-foreground text-sm">Seleccioná una sucursal y usá los filtros para continuar.</p>
      </div>
    </ClassicFilteredTableLayout>
  );
}
