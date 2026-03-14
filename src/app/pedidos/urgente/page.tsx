import { getPedidoUrgenteData } from "@/actions/pedidos";
import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosPedidoUrgente from "@/components/pedidos/FiltrosPedidoUrgente";
import GenerarPedidoButton from "@/components/pedidos/GenerarPedidoButton";
import TablaPedidoUrgente from "@/components/pedidos/TablaPedidoUrgente";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_SIZE } from "@/lib/pagination";

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
  });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

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
              sucursal={sucursalValida}
              sinFiltros={sinSucursal}
              mensajeSinSucursal="Seleccioná una sucursal para ver los productos."
              pedidoFilter={pedidoValida}
            />
          </CardContent>
        </Card>
        {sucursalValida && totalPaginas > 1 && (
          <div className="flex justify-end pt-2">
            <PaginacionTabla
              basePath="/pedidos/urgente"
              params={{
                sucursal: sucursalValida,
                proveedor,
                q,
                pedido: pedidoValida,
              }}
              paginaActual={paginaNum}
              totalPaginas={totalPaginas}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>
    </ClassicFilteredTableLayout>
  );
}
