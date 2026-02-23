import { prisma } from "@/lib/prisma";
import { Separator } from "@/components/ui/separator";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";
import ImportarModal from "@/components/proveedores/ImportarModal";
import TablaProductosFiltrada from "@/components/proveedores/TablaProductosFiltrada";
import FiltrosProductos from "@/components/proveedores/FiltrosProductos";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ q?: string; proveedor?: string; pagina?: string }>;
}

export default async function ProveedoresPage({ searchParams }: Props) {
  const { q = "", proveedor = "", pagina = "1" } = await searchParams;
  const paginaNum = Math.max(1, parseInt(pagina) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const where = {
    ...(proveedor ? { proveedorId: proveedor } : {}),
    ...(q ? {
      OR: [
        { descripcion: { contains: q, mode: "insensitive" as const } },
        { codExt:      { contains: q, mode: "insensitive" as const } },
        { codProdProv: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [proveedores, productos, total] = await Promise.all([
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    }),
    prisma.producto.findMany({
      where,
      orderBy: { codExt: "asc" },
      skip,
      take: PAGE_SIZE,
      include: { proveedor: { select: { id: true, nombre: true, codigoUnico: true, sufijo: true } } },
    }),
    prisma.producto.count({ where }),
  ]);

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Controles fijos */}
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <CrearProveedorModal />
          <ImportarModal proveedores={proveedores} />
        </div>
        <Separator className="opacity-50" />
        <FiltrosProductos
          proveedores={proveedores}
          totalProductos={total}
          qActual={q}
          proveedorActual={proveedor}
        />
      </div>

      {/* Tabla con scroll interno */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3">
        <TablaProductosFiltrada productos={productos} />
      </div>

      {/* Paginación fija abajo */}
      <div className="shrink-0 border-t border-border/50 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3">
        <PaginacionProductos
          paginaActual={paginaNum}
          totalPaginas={totalPaginas}
          total={total}
          pageSize={PAGE_SIZE}
          q={q}
          proveedor={proveedor}
        />
      </div>
    </div>
  );
}
