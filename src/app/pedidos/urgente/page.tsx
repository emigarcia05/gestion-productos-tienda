import { prisma } from "@/lib/prisma";
import { whereProductoConsultaConTienda } from "@/lib/busqueda";
import PageHeader from "@/components/PageHeader";
import { getPedidosTabs } from "@/lib/pedidosTabs";
import BuscadorSimple from "@/components/proveedores/BuscadorSimple";
import TablaListaPreciosConPedido from "@/components/proveedores/TablaListaPreciosConPedido";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";
import SelectorSucursal from "@/components/pedidos/SelectorSucursal";
import SelectorProveedor from "@/components/pedidos/SelectorProveedor";
import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SucursalPedido = "guaymallen" | "maipu";

interface Props {
  searchParams: Promise<{ q?: string; pagina?: string; sucursal?: string; proveedor?: string }>;
}

export default async function PedidoUrgentePage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/");

  const { q = "", pagina = "1", sucursal = "", proveedor = "" } = await searchParams;
  const sucursalValida: SucursalPedido | "" = sucursal === "maipu" ? "maipu" : sucursal === "guaymallen" ? "guaymallen" : "";
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const whereSimple = await whereProductoConsultaConTienda(prisma, q);
  const where = {
    ...whereSimple,
    ...(proveedor ? { proveedorId: proveedor } : {}),
  };

  const [proveedores, productos, total] = await Promise.all([
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, sufijo: true },
    }),
    prisma.producto.findMany({
      where,
      orderBy: [{ proveedor: { nombre: "asc" } }, { descripcion: "asc" }],
      skip,
      take: PAGE_SIZE,
      include: {
        proveedor: { select: { id: true, nombre: true, codigoUnico: true, sufijo: true } },
      },
    }),
    prisma.producto.count({ where }),
  ]);

  const totalPaginas = Math.ceil(total / PAGE_SIZE);
  const tabs = getPedidosTabs("urgente");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PageHeader
        volverHref="/"
        titulo="Pedidos a Proveedores"
        mostrarTienda={puede(rol, PERMISOS.tienda.acceso)}
        mostrarStock={puede(rol, PERMISOS.stock.acceso)}
        tabs={tabs}
      />

      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        <div className="flex items-center gap-4 flex-wrap">
          <SelectorSucursal
            sucursalActual={sucursalValida}
            paramsActuales={{ q, pagina: pagina === "1" ? undefined : pagina, proveedor: proveedor || undefined }}
            basePath="/pedidos/urgente"
          />
          <SelectorProveedor
            proveedores={proveedores}
            proveedorActual={proveedor}
            paramsActuales={{ q, sucursal: sucursalValida || undefined, pagina: pagina === "1" ? undefined : pagina }}
            basePath="/pedidos/urgente"
          />
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <BuscadorSimple
              qActual={q}
              totalProductos={total}
              extraParams={{ ...(sucursalValida ? { sucursal: sucursalValida } : {}), ...(proveedor ? { proveedor } : {}) }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3 pt-3">
        <TablaListaPreciosConPedido productos={productos} />
      </div>

      <div className="shrink-0 border-t border-border/50 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3">
        <PaginacionProductos
          paginaActual={paginaNum}
          totalPaginas={totalPaginas}
          total={total}
          pageSize={PAGE_SIZE}
          q={q}
          proveedor={proveedor}
          basePath="/pedidos/urgente"
          extraParams={{ ...(sucursalValida ? { sucursal: sucursalValida } : {}) }}
        />
      </div>
    </div>
  );
}
