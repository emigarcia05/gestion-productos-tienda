import { prisma } from "@/lib/prisma";
import { whereProductoConsultaConTienda } from "@/lib/busqueda";
import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import SectionHeader from "@/components/SectionHeader";
import { Separator } from "@/components/ui/separator";
import FiltrosPedidoUrgente from "@/components/pedidos/FiltrosPedidoUrgente";
import PedidoUrgenteTablaConToast from "@/components/pedidos/PedidoUrgenteTablaConToast";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SucursalPedido = "guaymallen" | "maipu";

interface Props {
  searchParams: Promise<{ q?: string; pagina?: string; sucursal?: string; proveedor?: string }>;
}

export default async function PedidoUrgentePage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

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

  return (
    <div className="flex flex-col min-h-0">
      <SectionHeader titulo="Pedido Mercadería" subtitulo="Pedido Urgente" />

      <FiltrosPedidoUrgente
        q={q}
        sucursal={sucursalValida}
        proveedor={proveedor}
        proveedores={proveedores}
        totalProductos={total}
      />

      <Separator className="bg-slate-200/60" />

      <div className="flex-1 min-h-0 px-4 pb-4 max-w-7xl mx-auto w-full">
        <Card className="min-h-0 flex flex-col rounded-xl border-slate-200 bg-white overflow-hidden gap-0 py-0 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 overflow-auto p-0">
            <PedidoUrgenteTablaConToast productos={productos} />
          </CardContent>
        </Card>
      </div>

      <div className="shrink-0 border-t border-border bg-card px-4 py-3">
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
