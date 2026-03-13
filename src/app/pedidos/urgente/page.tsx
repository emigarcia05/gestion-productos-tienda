import { getPedidoUrgenteData } from "@/actions/pedidos";
import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosPedidoUrgente from "@/components/pedidos/FiltrosPedidoUrgente";
import GenerarPedidoButton from "@/components/pedidos/GenerarPedidoButton";
import TablaPedidoUrgente from "@/components/pedidos/TablaPedidoUrgente";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

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
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const sinSucursal = !sucursalValida;

  const { proveedores, productos, total, totalPaginas } = await getPedidoUrgenteData({
    sucursal: sucursalValida,
    q,
    pagina: String(paginaNum),
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
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <Card className="min-h-0 flex flex-col rounded-xl border-border bg-card overflow-hidden gap-0 py-0 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 overflow-x-auto overflow-y-visible p-0">
            <TablaPedidoUrgente
              productos={productos}
              sinFiltros={sinSucursal}
              mensajeSinSucursal="Seleccioná una sucursal para ver los productos."
              pedidoFilter={pedidoValida}
            />
          </CardContent>
        </Card>
        <div className="shrink-0 border-t border-border bg-card px-4 py-3">
          <PaginacionProductos
            paginaActual={paginaNum}
            totalPaginas={totalPaginas}
            total={total}
            pageSize={PAGE_SIZE}
            q={q}
            proveedor={proveedor}
            basePath="/pedidos/urgente"
            extraParams={{
              ...(sucursalValida ? { sucursal: sucursalValida } : {}),
              ...(pedidoValida ? { pedido: pedidoValida } : {}),
            }}
          />
        </div>
      </div>
    </ClassicFilteredTableLayout>
  );
}
