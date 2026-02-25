import { prisma } from "@/lib/prisma";
import { filtroTexto, whereProductoConsultaConTienda } from "@/lib/busqueda";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";
import ImportarModal from "@/components/proveedores/ImportarModal";
import TablaProductosFiltrada from "@/components/proveedores/TablaProductosFiltrada";
import TablaListaPreciosConPedido from "@/components/proveedores/TablaListaPreciosConPedido";
import FiltrosProductos from "@/components/proveedores/FiltrosProductos";
import BuscadorSimple from "@/components/proveedores/BuscadorSimple";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";
import AccionMasivaModal from "@/components/proveedores/AccionMasivaModal";
import SectionHeader from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ q?: string; proveedor?: string; pagina?: string }>;
}

export default async function ProveedoresPage({ searchParams }: Props) {
  const { q = "", proveedor = "", pagina = "1" } = await searchParams;
  const paginaNum = Math.max(1, parseInt(pagina) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;
  const rol = await getRol();
  const p = PERMISOS.proveedores;
  const esEditor = rol === "editor";

  const where = {
    ...(proveedor ? { proveedorId: proveedor } : {}),
    ...(q ? filtroTexto(q, ["descripcion", "codExt", "codProdProv"]) : {}),
  };

  // Vista simple: productos con precio sugerido; búsqueda por descripción proveedor o por descripción tienda (vía codExt)
  const whereSimple = await whereProductoConsultaConTienda(prisma, q);

  const [proveedores, productos, total] = await Promise.all([
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    }),
    esEditor
      ? prisma.producto.findMany({
          where,
          orderBy: { codExt: "asc" },
          skip,
          take: PAGE_SIZE,
          include: { proveedor: { select: { id: true, nombre: true, codigoUnico: true, sufijo: true } } },
        })
      : prisma.producto.findMany({
          where: whereSimple,
          orderBy: [{ proveedor: { nombre: "asc" } }, { descripcion: "asc" }],
          skip,
          take: PAGE_SIZE,
          include: { proveedor: { select: { id: true, nombre: true, codigoUnico: true, sufijo: true } } },
        }),
    esEditor
      ? prisma.producto.count({ where })
      : prisma.producto.count({ where: whereSimple }),
  ]);

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  const titulo = esEditor ? "Lista de Proveedores" : "Lista de Proveedores";
  const descripcion = esEditor
    ? "Gestiona productos y precios de tus proveedores."
    : "Gestiona y visualiza los precios sugeridos de tus proveedores.";

  const acciones =
    esEditor && (puede(rol, p.acciones.nuevoProveedor) || puede(rol, p.acciones.importarLista)) ? (
      <div className="flex gap-2">
        {puede(rol, p.acciones.nuevoProveedor) && <CrearProveedorModal />}
        {puede(rol, p.acciones.importarLista) && <ImportarModal proveedores={proveedores} />}
      </div>
    ) : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo={titulo}
        descripcion={descripcion}
        actions={acciones}
      />

      {/* Filtros */}
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        {esEditor ? (
          <FiltrosProductos
            proveedores={proveedores}
            totalProductos={total}
            qActual={q}
            proveedorActual={proveedor}
            accionMasivaSlot={
              puede(rol, p.acciones.accionMasiva) ? (
                <AccionMasivaModal
                  proveedores={proveedores}
                  filtroProveedorActual={proveedor}
                  filtroBusquedaActual={q}
                  totalFiltrado={total}
                />
              ) : undefined
            }
          />
        ) : (
          <BuscadorSimple qActual={q} totalProductos={total} />
        )}
      </div>

      {/* Card con tabla */}
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3 flex flex-col">
        <Card className="flex-1 min-h-0 flex flex-col rounded-xl border-slate-200 shadow-lg overflow-hidden gap-0 py-0">
          <CardContent className="flex-1 min-h-0 overflow-auto p-0">
            {esEditor
              ? <TablaProductosFiltrada productos={productos} rol={rol} />
              : <TablaListaPreciosConPedido productos={productos} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Paginación */}
      <div className="shrink-0 border-t border-slate-200/60 bg-white/80 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3">
        <PaginacionProductos
          paginaActual={paginaNum}
          totalPaginas={totalPaginas}
          total={total}
          pageSize={PAGE_SIZE}
          q={q}
          proveedor={esEditor ? proveedor : ""}
        />
      </div>
    </div>
  );
}
